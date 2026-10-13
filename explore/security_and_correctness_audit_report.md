# Application Security & Correctness Audit Report

This report presents a read-only audit of the application's security posture, payment workflow integrity, upload safety, and API infrastructure. Each audited requirement is evaluated as **PASS**, **FAIL**, or **NOT VERIFIABLE FROM CODE** (requiring manual/runtime verification). Within each section, **FAIL** items appear first.

---

## 1. Admin Authentication & Session

| Status | Audit Requirement | File & Line Reference | Risk & Explanation |
| :--- | :--- | :--- | :--- |
| **FAIL** | Confirm `JWT_SECRET` is read from env, never hardcoded, and the app fails to start if missing. | [`backend/src/config/env.js:10`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/config/env.js#L10) | **Predictable JWT Signing Key Risk:** `jwtSecret` specifies a hardcoded fallback string (`'fallback_jwt_secret_bloom_loop_2026'`) if `process.env.JWT_SECRET` is omitted. The application does not fail fast on missing secret, allowing tokens to be forged if env variables fail to load. |
| **PASS** | Confirm bcrypt cost factor is 12 for password hashing. | [`backend/src/models/adminModel.js:38`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/models/adminModel.js#L38)<br>[`backend/src/scripts/seed.js:153`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/scripts/seed.js#L153) | Hashing explicitly generates salt using `bcrypt.genSalt(12)`. |
| **PASS** | Confirm `POST /api/v1/auth/login` is rate-limited and state exact limit. | [`backend/src/routes/authRoutes.js:9`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/authRoutes.js#L9)<br>[`backend/src/middleware/rateLimiter.js:4-18`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/rateLimiter.js#L4-L18) | `loginRateLimiter` enforces a strict max of 5 requests per 15-minute window. |
| **PASS** | Confirm login failure responses don't reveal whether email exists. | [`backend/src/services/authService.js:17,24`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/authService.js#L17) | Both non-existent emails and incorrect passwords throw generic `'Invalid email or password'` response. |
| **PASS** | Confirm `GET /api/v1/auth/me` correctly returns 401 for expired or tampered token. | [`backend/src/routes/authRoutes.js:10`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/authRoutes.js#L10)<br>[`backend/src/middleware/authMiddleware.js:18-32`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/authMiddleware.js#L18-L32) | Wrapped with `protectAdmin` which verifies token signature and expiration via `jwt.verify()`, returning 401 on failure. |
| **PASS** | Confirm all management/admin endpoints reject missing, expired, or invalid secret tokens. | [`backend/src/middleware/authMiddleware.js:6-33`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/authMiddleware.js#L6-L33) | All protected routes check authorization headers and reject unauthorized requests. |
| **PASS** | Confirm "Default Admin Credentials" box and old "Admin Portal" nav link are absent from rendered DOM. | [`frontend/src/pages/AdminLoginPage.jsx:35-103`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/pages/AdminLoginPage.jsx#L35-L103)<br>[`frontend/src/components/Navbar.jsx:37-60`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/components/Navbar.jsx#L37-L60) | No fallback credentials box or static link exists in JSX output. |
| **PASS** | Confirm Admin Profile icon never renders server-side-reachable data for logged-out users. | [`frontend/src/components/Navbar.jsx:66`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/components/Navbar.jsx#L66) | Admin profile pill is conditionally rendered strictly when `{isStorefrontPage && isAdminAuthenticated}` evaluates to true. |
| **PASS** | Confirm no plaintext password appears in Winston/Morgan logs. | [`backend/src/app.js:48`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/app.js#L48)<br>[`backend/src/services/authService.js:14-25`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/authService.js#L14-L25) | Morgan logs HTTP metadata only (method/URL/status); login service never logs password parameters. |

---

## 2. Payment Integration (Razorpay)

| Status | Audit Requirement | File & Line Reference | Risk & Explanation |
| :--- | :--- | :--- | :--- |
| **PASS** | Confirm order amount is ALWAYS computed server-side from DB prices in `create-order`. | [`backend/src/services/paymentService.js:53-78`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L53-L78)<br>[`backend/src/validators/paymentValidator.js:3-28`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/validators/paymentValidator.js#L3-L28) | Prices are re-fetched from MongoDB (`liveProduct.basePrice`) and summed server-side. Request body price inputs are ignored. |
| **PASS** | Confirm `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` never leak in payloads/logs/bundles. | [`backend/src/services/paymentService.js:184`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L184)<br>[`backend/src/config/razorpay.js:10`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/config/razorpay.js#L10) | Server returns only public `keyId` to client. Secrets remain isolated in server memory. |
| **PASS** | Confirm payment signature verification uses `crypto.timingSafeEqual`. | [`backend/src/utils/cryptoUtil.js:22`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/utils/cryptoUtil.js#L22) | Uses `crypto.timingSafeEqual(expectedBuffer, actualBuffer)` to mitigate timing attack vulnerabilities. |
| **PASS** | Confirm webhook route mounted with `express.raw()` BEFORE global `express.json()`. | [`backend/src/app.js:33-40`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/app.js#L33-L40) | Route `/api/v1/payments/webhook` is explicitly mounted with `express.raw({ type: 'application/json' })` before `express.json()`. |
| **PASS** | Confirm webhook signature verification happens before any DB write. | [`backend/src/services/paymentService.js:233-239`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L233-L239) | `verifyHmacSha256` executes first; invalid signatures abort execution immediately. |
| **PASS** | Confirm `verify-payment` and webhook handlers are idempotent. | [`backend/src/services/paymentService.js:214,257`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L214) | Repeat calls detect existing `PAID` status and return without duplicating stock or timestamp updates. |
| **PASS** | Confirm stock is restored on `payment.failed` webhook & 30-min expiry job. | [`backend/src/services/paymentService.js:276`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L276)<br>[`backend/src/services/orderExpiryJob.js:29-40`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/orderExpiryJob.js#L29-L40) | Both failure scenarios trigger stock restoration via `$inc: { stockCount: item.quantity }`. |
| **PASS** | Confirm atomic stock decrement prevents double-sale race conditions. | [`backend/src/services/paymentService.js:104-114`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L104-L114) | Uses atomic MongoDB operation `Product.findOneAndUpdate({ _id, availability: 'available', stockCount: { $gte: qty } }, { $inc: { stockCount: -qty } })`. |
| **PASS** | Confirm `AWAITING_PAYMENT` and `PAYMENT_FAILED` orders excluded from default admin list. | [`backend/src/services/orderService.js:20-25`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/orderService.js#L20-L25) | Default query filter applies `$nin: [ORDER_STATUSES.AWAITING_PAYMENT, ORDER_STATUSES.PAYMENT_FAILED]`. |
| **PASS** | Confirm status transition map rejects manual status changes from `AWAITING_PAYMENT`. | [`backend/src/services/orderService.js:65-71`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/orderService.js#L65-L71) | `updateOrderStatus` explicitly blocks admin manual state changes while order is in `AWAITING_PAYMENT` or `PAYMENT_FAILED`. |
| **NOT VERIFIABLE** | List test card/UPI scenarios and verify resulting order state. | Interactive testing required | Requires live modal interaction and real-time Webhook trigger testing in Razorpay Test Mode. |

---

## 3. Multi-Image Upload

| Status | Audit Requirement | File & Line Reference | Risk & Explanation |
| :--- | :--- | :--- | :--- |
| **PASS** | Confirm file type validation happens server-side (Multer `fileFilter`). | [`backend/src/middleware/uploadMiddleware.js:8-21`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/uploadMiddleware.js#L8-L21) | `fileFilter` restricts MIME types strictly to `['image/jpeg', 'image/png', 'image/webp']` on the server before storage. |
| **PASS** | Confirm 5MB per-file and 8-file count limits enforced server-side. | [`backend/src/middleware/uploadMiddleware.js:27`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/uploadMiddleware.js#L27)<br>[`backend/src/routes/productRoutes.js:15,23`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/productRoutes.js#L15) | `limits: { fileSize: 5MB }` and `upload.array('images', 8)` enforce constraints server-side. |
| **PASS** | Confirm orphaned Cloudinary uploads purged if DB write fails. | [`backend/src/services/productService.js:117-123,235-240`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/productService.js#L117) | `catch` block catches DB failure and cleans up all `newlyUploadedPublicIds` via `deleteCloudinaryImage()`. |
| **PASS** | Confirm `removeImageIds` purges images from Cloudinary. | [`backend/src/services/productService.js:229-232`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/productService.js#L229-L232) | Iterates over `imagesToDelete` and invokes `deleteCloudinaryImage()` after product save. |
| **PASS** | Confirm products cannot be saved with zero images or zero `isPrimary` images. | [`backend/src/services/productService.js:184-186`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/productService.js#L184-L186)<br>[`backend/src/services/productService.js:7-21`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/productService.js#L7-L21) | Rejects empty image arrays with HTTP 400 and runs `sortAndNormalizeImages()` to enforce exactly one primary image. |
| **PASS** | Confirm Cloudinary upload uses environment variables, not hardcoded keys. | [`backend/src/config/cloudinary.js:16-21`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/config/cloudinary.js#L16-L21) | Uses `env.cloudinary.cloudName`, `env.cloudinary.apiKey`, and `env.cloudinary.apiSecret`. |

---

## 4. General API & Infrastructure

| Status | Audit Requirement | File & Line Reference | Risk & Explanation |
| :--- | :--- | :--- | :--- |
| **FAIL** | Confirm rate limiting exists on: admin login, create-order, verify-payment. | [`backend/src/routes/orderRoutes.js:8`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/orderRoutes.js#L8) | **Missing Rate Limiter Risk:** While `POST /api/v1/payments/create-order` and `POST /api/v1/payments/verify-payment` have `paymentRateLimiter`, the standard `POST /api/v1/orders` route is missing rate limiting middleware. |
| **FAIL** | Check whether MONGO_URI, JWT_SECRET, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, and CLOUDINARY_API_SECRET are referenced ONLY via process.env with no fallback defaults. | [`backend/src/config/env.js:9,10,21,22,23`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/config/env.js#L9) | **Insecure Fallback Secrets Risk:** Hardcoded fallback values exist in `config/env.js` for `mongoUri`, `jwtSecret`, `keyId`, `keySecret`, and `webhookSecret` instead of failing startup when secrets are omitted. |
| **PASS** | Confirm CORS restricted to actual frontend origin(s) in production. | [`backend/src/app.js:25-30`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/app.js#L25-L30) | Restricts CORS origin strictly to `env.clientUrl` in production mode. |
| **PASS** | Confirm Helmet applied and check security headers. | [`backend/src/app.js:18-22`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/app.js#L18-L22) | Helmet is applied globally, configuring standard protective security headers. |
| **PASS** | Confirm `express-mongo-sanitize` applied globally to prevent NoSQL injection. | [`backend/src/app.js:42`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/app.js#L42) | `app.use(mongoSanitize())` strips `$` and `.` operators globally from query parameters and bodies. |
| **PASS** | Confirm production error responses mask stack traces and use `{ success, error }` shape. | [`backend/src/middleware/errorHandler.js:5-37`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/middleware/errorHandler.js#L5-L37)<br>[`backend/src/utils/responseHandler.js:15-26`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/utils/responseHandler.js#L15-L26) | All errors are sanitized through `sendError()`, hiding internal stack traces from clients. |
| **PASS** | Confirm all public input endpoints have Zod/validator coverage. | [`backend/src/routes/orderRoutes.js:8`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/orderRoutes.js#L8)<br>[`backend/src/routes/paymentRoutes.js:11,18`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/routes/paymentRoutes.js#L11) | `createOrderSchema`, `createPaymentOrderSchema`, `verifyPaymentSchema`, and `loginSchema` validate input data. |
| **PASS** | Confirm `.env` is in `.gitignore` and never committed to version control. | [`.gitignore:7-13`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/.gitignore#L7-L13)<br>[`backend/.gitignore:5-9`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/.gitignore#L5-L9) | `.env` files are ignored across root and backend `.gitignore`. Git commit history confirms `.env` was never tracked. |

---

## 5. Manual Test Checklist

Below are the step-by-step runtime tests to execute manually for items marked **NOT VERIFIABLE FROM CODE**:

### 🧪 Test 1: Razorpay Payment Success Scenario
1. Open the storefront catalog at `http://localhost:5173/shop` and add a bouquet item to cart.
2. Proceed to checkout and fill out customer delivery details.
3. Click **Proceed to Payment with Razorpay**.
4. In the Razorpay Test Modal, select **Card** and enter the standard test card details:
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry**: `12/30`
   - **CVV**: `123`
5. Click **Pay Now** and choose **Success**.
6. **Verification Steps**:
   - Confirm browser redirects to Order Success page.
   - Inspect MongoDB: verify order `paymentStatus` is `PAID` and `orderStatus` is `PENDING_REVIEW`.

### 🧪 Test 2: Razorpay Payment Failure Scenario
1. Add a bouquet item to cart and proceed to checkout.
2. Click **Proceed to Payment with Razorpay**.
3. In the Razorpay Test Modal, select **Card** with number `4111 1111 1111 1111`.
4. Click **Pay Now** and choose **Failure**.
5. **Verification Steps**:
   - Confirm error toast appears in checkout UI.
   - Verify MongoDB order record has `paymentStatus: "FAILED"` and `orderStatus: "PAYMENT_FAILED"`.
   - Verify item stock was automatically restored in MongoDB.

### 🧪 Test 3: Razorpay Modal Closed Without Paying
1. Initiate checkout and trigger the Razorpay payment modal.
2. Close the modal by clicking the `X` icon without attempting payment.
3. **Verification Steps**:
   - Confirm application remains on checkout page with clear user notification.
   - Verify order remains in `AWAITING_PAYMENT` state.
   - Wait 30 minutes (or trigger `cleanupExpiredOrders()` manually) and confirm job transitions order to `EXPIRED` / `PAYMENT_FAILED` and restores stock.

### 🧪 Test 4: Concurrent Order Creation for Low-Stock Item
1. Set a product stock to `1` in MongoDB.
2. Open two browser windows simultaneously on the checkout page for that product.
3. Submit checkout in both windows at the exact same millisecond.
4. **Verification Steps**:
   - Verify only one order succeeds in creating a Razorpay transaction.
   - Verify the second request receives HTTP 400 with code `ERR_INSUFFICIENT_STOCK`.
