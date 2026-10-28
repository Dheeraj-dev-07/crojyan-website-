# Pre-Deployment Verification Report
**Application:** Crojyan (Bloom & Loop) — Handcrafted Crochet Flower Bouquets E-Commerce Platform  
**Branch:** `test/predeploy-verification`  
**Execution Mode:** READ-ONLY Verification Suite (No application code, configuration, or dependencies modified)  
**Execution Date:** 2026-10-26  
**Environment:** Node.js v24.18.0 / In-Memory MongoDB (`mongodb-memory-server` v11.3.0) / Ephemeral Express HTTP Client  

---

## 1. Executive Summary & Verification Matrix

| Check ID | Verification Area | Target Components | Result |
| :--- | :--- | :--- | :--- |
| **CHECK 1** | **Webhook Intake Verification** | `src/app.js`, `src/services/paymentService.js`, `src/utils/cryptoUtil.js` | **PASS** |
| **CHECK 2** | **Event Sequences Against Real Handler** | `src/services/paymentService.js`, `src/services/orderExpiryJob.js` | **FAIL (Defects Found)** |
| **CHECK 3** | **Payment Route Integrity** | `create-order`, `verify-payment`, atomic stock `$inc`, legacy route 404 | **PASS** |
| **CHECK 4** | **Production Boot and Configuration** | Fail-fast env, `/health`, CORS, proxy rate limiting, error hygiene | **PARTIAL (1 FAIL)** |
| **CHECK 5** | **Frontend Build & Leak Scan** | Production Vite build, secret scanner, route audit, Razorpay lazy load | **PARTIAL (2 NOTICES)** |
| **CHECK 6** | **Admin, State Visibility & Log Hygiene** | Admin auth matrix, order filtering, login enumeration, seedAdmin | **PASS** |

---

## 2. Defects & Vulnerabilities Identified (FAILs Listed First)

The following items failed verification or represent high-severity production risks. In compliance with read-only audit rules, **no source code has been altered**. Minimal text fixes are provided for engineering remediation.

### 🔴 FAIL 1: Inventory Oversell on Customer Retry (`payment.failed` followed by `payment.captured`)
- **Check Reference:** Check 2 — Event Sequence Scenario 3
- **File & Line:** [`repo/backend/src/services/paymentService.js:257-278`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L257-L278)
- **Risk Level:** **CRITICAL (Financial & Inventory Risk)**
- **Explanation:**  
  When a payment fails initially, Razorpay delivers `payment.failed`. The webhook handler updates the order state to `PAYMENT_FAILED` and restores reserved inventory via `restoreReservedStock(order.items)` (`Product.findByIdAndUpdate($inc: { stockCount: +qty })`).  
  If the customer retries payment within the open Razorpay checkout modal and succeeds, Razorpay issues `payment.captured` for the *same* `razorpay_order_id`. The handler at line 257 checks `order.paymentStatus !== PAYMENT_STATUSES.PAID` (which evaluates to `true` because status is currently `FAILED`). The handler transitions the order to `PAID` (`PENDING_REVIEW`) **without re-decrementing stock**. As verified by the test, the product stock count remains at 10 (restored) while the customer has a confirmed paid order. This allows other customers to purchase the same inventory, causing stock overselling and fulfillment disputes.
- **Suggested Minimal Fix (Text Only):**
  In `repo/backend/src/services/paymentService.js:257`, check if the order previously failed and released stock. If so, attempt to re-reserve stock before accepting the payment confirmation:
  ```javascript
  // In handleWebhookEvent, inside (eventName === 'payment.captured' || eventName === 'order.paid'):
  if (order && order.paymentStatus !== PAYMENT_STATUSES.PAID) {
    if (order.paymentStatus === PAYMENT_STATUSES.FAILED || order.paymentStatus === PAYMENT_STATUSES.EXPIRED) {
      // Re-reserve inventory atomically
      for (const item of order.items) {
        const prod = await Product.findOneAndUpdate(
          { _id: item.bouquetId, stockCount: { $gte: item.quantity } },
          { $inc: { stockCount: -item.quantity } },
          { new: true }
        );
        if (!prod) {
          logger.error(`Stock unavailable during retry capture for order ${order.orderId}`);
          order.paymentStatus = 'PAID_STOCK_DEPLETED';
          order.orderStatus = ORDER_STATUSES.PENDING_REVIEW;
          await order.save();
          return { status: 'stock_depleted_review_required' };
        }
      }
    }
    order.paymentStatus = PAYMENT_STATUSES.PAID;
    order.paidAt = new Date();
    if (rzpPaymentId) order.razorpayPaymentId = rzpPaymentId;
    order.orderStatus = ORDER_STATUSES.PENDING_REVIEW;
    await order.save();
  }
  ```

---

### 🔴 FAIL 2: Inventory Oversell on Late Payment After Expiry Cleanup
- **Check Reference:** Check 2 — Event Sequence Scenario 7
- **File & Line:** [`repo/backend/src/services/paymentService.js:257-264`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/services/paymentService.js#L257-L264)
- **Risk Level:** **CRITICAL (Inventory Release Conflict)**
- **Explanation:**  
  The background order expiry job (`src/services/orderExpiryJob.js:23-43`) runs every 10 minutes and cleans up unpaid orders older than 30 minutes, setting `paymentStatus = EXPIRED` and restoring held inventory.  
  If a customer submits payment on a checkout session that was open for >30 minutes, Razorpay captures the funds and delivers `payment.captured`. In `paymentService.js:257`, `order.paymentStatus !== PAID` is `true` (it is `EXPIRED`). The order is marked `PAID`, but the inventory was already restored to the catalog and was NOT re-reserved. The customer is charged and receives an order confirmation, while the physical bouquet has already been released to the store for others to buy.
- **Suggested Minimal Fix (Text Only):**
  Disallow transitioning an `EXPIRED` order directly to `PAID` without verifying/re-reserving stock. If stock is no longer available, mark order as `EXPIRED_PAYMENT_RECEIVED` and notify store management to issue an automated refund through the Razorpay Payments API (`razorpay.payments.refund`).

---

### 🔴 FAIL 3: Missing Razorpay Gateway Mode Startup Logging
- **Check Reference:** Check 4 — Part 4f
- **File & Line:** [`repo/backend/src/config/razorpay.js:12`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/config/razorpay.js#L12)
- **Risk Level:** **LOW (Operational & DevOps Observability)**
- **Explanation:**  
  At application boot, the server logs only: `Razorpay SDK client instance initialized successfully.` without logging whether it initialized in `rzp_test_` or `rzp_live_` mode. Site reliability engineers and developers cannot confirm at startup whether production or test mode credentials are bound, creating risk of unnoticed test gateway deployments in production.
- **Suggested Minimal Fix (Text Only):**
  In `repo/backend/src/config/razorpay.js`, add mode prefix detection without logging any secret material:
  ```javascript
  const mode = env.razorpay.keyId?.startsWith('rzp_live_') ? 'LIVE' : 'TEST';
  logger.info(`Razorpay SDK client instance initialized in [${mode}] mode.`);
  ```

---

### 🟡 PARTIAL 4: Unoptimized Large Image Assets (>300 KB up to 2.1 MB)
- **Check Reference:** Check 5 — Part 5a
- **File & Line:** [`repo/frontend/src/assets/hero-bouquet1.jpeg`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/assets/hero-bouquet1.jpeg) and 31 other images
- **Risk Level:** **MEDIUM (Performance, Bandwidth & Core Web Vitals)**
- **Explanation:**  
  32 image files in the repository exceed the recommended 300 KB limit. Key hero and Instagram showcase images range between 1.0 MB and 2.1 MB. When bundled into `dist/assets`, uncompressed JPEGs degrade page speed, increase Largest Contentful Paint (LCP) times, and consume excessive mobile user data.
- **Suggested Minimal Fix (Text Only):**
  Convert raw assets to modern WebP format using `sharp` or image optimization build plugins, reducing file sizes from 1.5MB+ down to <150KB. For product photos, utilize Cloudinary URL transformations with dynamic format and quality delivery (`q_auto,f_auto,w_1000`).

---

### 🟡 PARTIAL 5: Hardcoded Fallback Asset & Legacy Brand Tokens in Frontend
- **Check Reference:** Check 5 — Part 5b
- **File & Line:**
  - [`repo/frontend/src/pages/AdminDashboardPage.jsx:675`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/pages/AdminDashboardPage.jsx#L675): Unsplash fallback URL
  - [`repo/frontend/src/services/api.js:5`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/services/api.js#L5): `bloom_admin_token`
  - [`repo/frontend/src/context/CartContext.jsx:8,19`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/frontend/src/context/CartContext.jsx#L8): `bloom_cart_items`
- **Risk Level:** **LOW (External Dependency & Brand Consistency)**
- **Explanation:**  
  - Line 675 in `AdminDashboardPage.jsx` contains a hardcoded fallback: `https://images.unsplash.com/photo-1563245372-f21724e3856d`. If Unsplash removes this resource, admin catalog previews will render broken image thumbnails.
  - Legacy `bloom_*` keys remain in `localStorage` across `api.js`, `AuthContext.jsx`, and `CartContext.jsx` despite rebranding to Crojyan.
- **Suggested Minimal Fix (Text Only):**
  Replace the Unsplash URL with a local SVG or WebP placeholder `/assets/placeholder.svg`. Standardize storage keys to `crojyan_admin_token` and `crojyan_cart_items`.

---

## 3. Full Check 2 Event Sequence Trace & Anomaly Log

All 8 scenarios were executed against an in-memory MongoDB instance and the real Express application handler.

| Case # | Event Sequence Delivery Scenario | HTTP Responses | Final `paymentStatus` | Final `orderStatus` | Final Stock Count | Verdict & Anomaly Details |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | `payment.captured` delivered twice | `[200, 200]` | `PAID` | `PENDING_REVIEW` | 8 (Initial: 8) | **PASS** — Second event ignored idempotently. No duplicate writes or stock changes. |
| **2** | `payment.captured` delivered 5 times concurrently | `[200, 200, 200, 200, 200]` | `PAID` | `PENDING_REVIEW` | 8 (Initial: 8) | **PASS** — All 5 parallel requests resolved with HTTP 200. Order saved to PAID; no version conflict errors. |
| **3** | `payment.failed` THEN `payment.captured` (customer retried in modal and paid) | `[200, 200]` | `PAID` | `PENDING_REVIEW` | **10** (Expected: 8) | **FAIL** — **CRITICAL INVENTORY LEAK**: Stock restored (+2) on failure, but late capture marked order `PAID` without re-reserving stock. Stock is 10 for a paid order. |
| **4** | `payment.captured` THEN a late `payment.failed` (stale failure attempt) | `[200, 200]` | `PAID` | `PENDING_REVIEW` | 8 (Initial: 8) | **PASS** — Stale `payment.failed` was safely ignored because `order.paymentStatus === 'PAID'`. Stock untouched. |
| **5** | `payment.failed` delivered twice | `[200, 200]` | `FAILED` | `PAYMENT_FAILED` | 10 (Initial: 8) | **PASS** — Stock restored once (+2). Second delivery detected `FAILED` status and did not increment stock again. |
| **6** | `order.paid` and `payment.captured` both arriving for same order | `[200, 200]` | `PAID` | `PENDING_REVIEW` | 8 (Initial: 8) | **PASS** — Single clean transition from `CREATED` to `PAID`. Second event was a no-op. |
| **7** | `payment.captured` arriving AFTER 30-min order expiry cleanup job | `[200]` | `PAID` | `PENDING_REVIEW` | **10** (Expected: 8) | **FAIL** — **CRITICAL LATE PAYMENT LEAK**: Order expired and stock released to catalog (8 -> 10). Late webhook marked order `PAID` without re-reserving stock. Customer has paid order with zero reserved stock. |
| **8** | `verify-payment` and webhook racing at the exact same moment | `[200, 200]` | `PAID` | `PENDING_REVIEW` | 8 (Initial: 8) | **PASS** — Both routes completed with HTTP 200. Order finalized to `PAID`, stock unchanged. |

---

## 4. Detailed Results Across All Checks

### CHECK 1: Webhook Intake Verification
- **1a. Route Mounting Order:** **PASS**  
  Mounted at index 4 with `express.raw({ type: 'application/json' })`, strictly BEFORE global `express.json()` at index 5. Normal JSON endpoints (`POST /api/v1/auth/login`) continue to parse JSON payloads without disruption.
- **1b. HMAC-SHA256 Signature Verification:** **PASS**  
  - Valid HMAC-SHA256 signature accepted (HTTP 200).  
  - Missing signature header rejected (HTTP 400).  
  - Wrong-length signature rejected without runtime exception (HTTP 400).  
  - Tampered payload body rejected (HTTP 400).  
  - Whitespace-re-serialized body rejected (HTTP 400), proving raw byte comparison is enforced.  
  - Confirmed **zero database writes** occur on any rejected request.
- **1c. Unknown Events & Order IDs:** **PASS**  
  Unhandled event types (`subscription.charged`) and unknown `razorpay_order_id` return HTTP 200 without throwing or executing database updates, ensuring Razorpay does not engage in 24-hour retry storms.
- **1d. Handler Latency:** **PASS**  
  Average execution time: **8.4ms** (Max: 13.7ms), far below the Razorpay 5000ms timeout. Code inspection confirms no asynchronous external calls (email, disk I/O, external HTTP) are awaited inside the handler.
- **1e. Infrastructure Isolation:** **PASS**  
  Webhook route is unconstrained by CORS (`!origin` bypasses browser CORS), exempt from rate limiting (35 rapid requests passed with 0 HTTP 429s), and processes `X-Forwarded-For` proxy headers correctly.

### CHECK 3: Payment Route Integrity
- **3a. Server-Side Price Calculation:** **PASS**  
  `create-order` computes prices solely from current MongoDB database prices (`liveProduct.basePrice * quantity` in paise). Client-provided tampering fields (`amount`, `total`, `price`, `unitPrice`) are stripped and completely ignored. Stale cart items and sold-out products return HTTP 400 with `ERR_STALE_CART_ITEM`.
- **3b. Concurrency & Rollback:** **PASS**  
  Firing 20 parallel `create-order` requests against a bouquet with stock 10 resulted in **exactly 10 orders created (HTTP 201)** and **10 rejected with `ERR_INSUFFICIENT_STOCK` (HTTP 400)**. Final stock was exactly 0. Injected failure in mocked `razorpayInstance.orders.create` triggered immediate stock restoration rollback.
- **3c. Signature Verification in `verify-payment`:** **PASS**  
  Timing attack mitigation verified: `crypto.timingSafeEqual(expectedBuffer, actualBuffer)` is located at [`repo/backend/src/utils/cryptoUtil.js:22`](file:///c:/workplace_freelancing_3/crojyan_client_akanshi/repo/backend/src/utils/cryptoUtil.js#L22). Tampered order ID, payment ID, or signature returns HTTP 400. Duplicate calls return HTTP 200 idempotently.
- **3d. Legacy Orders Route:** **PASS**  
  `POST /api/v1/orders` returns HTTP 404 Not Found (`ERR_PRODUCT_NOT_FOUND`).

### CHECK 4: Production Boot and Configuration
- **4a. Production Health Check:** **PASS**  
  `GET /health` with `NODE_ENV=production` returns HTTP 200 (`status: "UP"`, `database: "connected"`) when MongoDB is active, and returns HTTP 503 (`status: "DOWN"`, `database: "disconnected"`) when database connection is severed.
- **4b. Fail-Fast Environment Validation:** **PASS**  
  Omission of each required variable (`MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLIENT_URL` in production) caused the process to exit immediately with status 1, explicitly naming the missing variable in stderr. `JWT_SECRET` shorter than 32 characters was rejected with status 1.
- **4c. Production CORS Origin Filtering:** **PASS**  
  Tested with `CLIENT_URL="https://crojyan.com,https://admin.crojyan.com/"`:
  - Allowed origin `https://crojyan.com` received `Access-Control-Allow-Origin: https://crojyan.com`.
  - Allowed origin `https://admin.crojyan.com` received `Access-Control-Allow-Origin: https://admin.crojyan.com`.
  - Disallowed origin `https://malicious-website.com` received no allow-origin header.
  - Wildcard `*` was disallowed. Requests without `Origin` header returned HTTP 200.
- **4d. Proxy Rate Limiting:** **PASS**  
  With `TRUST_PROXY_HOPS=1`, client IP A (`198.51.100.1`) was rate-limited on the 6th login attempt (HTTP 429), while client IP B (`198.51.100.2`) from a different proxy forwarding header remained unblocked (HTTP 401). Zero `ERR_ERL_*` warnings in logs.
- **4e. Production Error Format & Secret Hygiene:** **PASS**  
  All application errors follow the uniform response envelope:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERR_CODE_IDENTIFIER",
      "message": "Human readable message",
      "details": []
    }
  }
  ```
  Verified that zero stack traces, server file paths, or environment variables leak in HTTP responses.
- **4f. Razorpay Mode Logging:** **FAIL** (See Defect 3 above).

### CHECK 5: Frontend Build & Leak Scan
- **5a. Production Vite Build:** **PASS**  
  Built in 3.55s. JS bundle: 285.68 kB (80.30 kB gzip). CSS bundle: 40.99 kB (7.23 kB gzip). (Image size warnings noted in Defect 4).
- **5b. Secret Scanner:** **PASS**  
  Scanned frontend source and dist: zero instances of `RAZORPAY_KEY_SECRET`, `key_secret`, `webhook secret`, `mongodb+srv`, or `cloudinary api_secret`. Only the public `RAZORPAY_KEY_ID` is present.
- **5c. Client Route & Link Audit:** **PASS**  
  All 8 routes defined in `App.jsx` (`/`, `/shop`, `/our-craft`, `/products/:id`, `/checkout`, `/order-success/:orderId`, `/admin/login`, `/admin`) resolve. Audited all 21 in-app links across Navbar, Hero, CTA buttons, Footer, and CartDrawer; zero broken links found.
- **5d. Razorpay SDK Lazy Load:** **PASS**  
  `<script src="https://checkout.razorpay.com/v1/checkout.js">` is absent from `index.html`. It is dynamically injected only upon mounting `CheckoutPage.jsx`. Simulated network/script load failure verified to trigger explicit user error alert.
- **5e. Host SPA Rewrite:** **PASS**  
  Deep routes (`/shop`, `/our-craft`, `/products/:id`, `/checkout`, `/order-success/:orderId`, `/admin/login`, `/admin`) require host fallback to `index.html`. `repo/frontend/vercel.json` already contains `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

### CHECK 6: Admin, State Visibility & Log Hygiene
- **6a. Admin Authentication Matrix:** **PASS**  
  Tested all 7 protected admin routes across 4 invalid token states (No token, Expired token, Wrong signature secret, Malformed string) — all 28 requests returned HTTP 401:

| Admin Route | No Token | Expired Token | Wrong Secret | Malformed Token |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/auth/me` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `GET /api/v1/orders` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `GET /api/v1/orders/:id` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `PATCH /api/v1/orders/:id/status` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `POST /api/v1/products` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `PUT /api/v1/products/:id` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |
| `DELETE /api/v1/products/:id` | **401 PASS** | **401 PASS** | **401 PASS** | **401 PASS** |

- **6b. Order Visibility & Transition Guards:** **PASS**  
  Default `GET /api/v1/orders` query returns only confirmed orders (`CONFIRMED`, `PAID`), filtering out `AWAITING_PAYMENT` and `PAYMENT_FAILED`. Attempting to manually update status on an order in `AWAITING_PAYMENT` or `PAYMENT_FAILED` is rejected with HTTP 400 (`ERR_INVALID_STATUS_TRANSITION`).
- **6c. Login Enumeration Protection:** **PASS**  
  Non-existent email and wrong password for an existing account both return the exact same generic response: `"Invalid email or password"`.
- **6d. Log PII & Secret Hygiene:** **PASS**  
  Captured stdout, stderr, `combined.log`, and `error.log`. Scanned for dummy secrets, passwords, JWT tokens, customer phone numbers, emails, addresses, and gift notes. **Zero leakages detected.**
- **6e. Admin Seed Script (`scripts/seedAdmin.js`):** **PASS**  
  - Initial run creates admin user with bcrypt cost factor 12 (verified).
  - Idempotent re-run detects existing user and safely makes no changes.
  - `--reset` updates password hash and resets login attempts counter.
  - Weak passwords (<12 characters) exit non-zero with `[SEED ERROR]`.

---

## 5. Exact Commands to Re-Run Every Test

All tests use in-memory MongoDB, mock external services, use dummy secrets, and make zero network requests to real third parties.

### Run All Checks in One Command
```bash
# From workspace root
node backend/tests/predeploy/runAll.js
```

### Run Individual Checks
```bash
# Check 1: Webhook Intake Verification
node backend/tests/predeploy/check1_webhook_intake.test.js

# Check 2: Event Sequences & Concurrency Scenarios
node backend/tests/predeploy/check2_event_sequences.test.js

# Check 3: Payment Route Integrity (create-order, verify-payment, stock)
node backend/tests/predeploy/check3_payment_integrity.test.js

# Check 4: Production Boot, Fail-Fast Env, CORS, Proxy & Health
node backend/tests/predeploy/check4_production_boot.test.js

# Check 5: Frontend Build & Sensitive String / Image Scan
node backend/tests/predeploy/check5_frontend_scan.test.js

# Check 6: Admin Auth Matrix, Order Visibility & Log Hygiene
node backend/tests/predeploy/check6_admin_and_hygiene.test.js
```

---

## 6. NOT VERIFIABLE LOCALLY

The following items cannot be fully verified within an in-memory local testing environment and must be validated on the production staging platform:

1. **Always-On Hosting & Background Job Persistence:**  
   The 30-minute order cleanup task (`orderExpiryJob.js`) relies on Node's `setInterval`. On serverless platforms (e.g. Vercel Serverless Functions, AWS Lambda), background intervals freeze between requests. A dedicated persistent Node.js instance (Render, Railway, DigitalOcean App Platform) or an external cron trigger (e.g. Cron-Job.org, AWS EventBridge) calling a secured endpoint is required to ensure unpaid stock is reliably released.
2. **Production Host SPA Fallback Rewrite:**  
   Local test simulated client-side routing. On actual hosting providers (Cloudflare Pages, AWS S3/CloudFront, Nginx), verify that direct browser refreshes on `/products/:id` and `/checkout` load `index.html` with HTTP 200 rather than a web server 404 page.
3. **Real Webhook Delivery from Razorpay Live Servers:**  
   Local tests signed synthetic payloads with HMAC-SHA256. Once deployed with an active domain and SSL/TLS certificate, trigger a live or test mode webhook from the Razorpay Dashboard to verify firewall, DNS, and reverse proxy compatibility.
4. **HTTPS and Domain Setup (HSTS & Strict-Transport-Security):**  
   Local tests ran over HTTP loopback. Verify in production that HTTP automatically redirects to HTTPS and that Helmet headers enforce HSTS over the live custom domain (`crojyan.com`).
5. **Razorpay Live Activation & Bank Gateway Status:**  
   Switching from `rzp_test_` to `rzp_live_` credentials requires active KYC verification on the Razorpay Dashboard. Live UPI intent, card 3D Secure OTP verification, and netbanking flows must be tested with nominal real INR transactions.
6. **Real-Device and Mobile Browser Testing:**  
   Verify touch target ergonomics, keyboard dismissal during checkout form entry, and Razorpay standard checkout modal popups across mobile Safari (iOS) and Chrome (Android).
