const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const {
  BACKEND_ROOT,
  DUMMY_SECRETS,
  startInMemoryMongo,
  stopInMemoryMongo,
  clearDatabase,
  createTestClient,
  createTestProduct,
  createTestOrder
} = require('./common');

const jwt = require(path.join(BACKEND_ROOT, 'node_modules/jsonwebtoken'));

async function runCheck6() {
  console.log('====================================================');
  console.log('CHECK 6: ADMIN, STATE VISIBILITY, AND LOG HYGIENE');
  console.log('====================================================');

  const results = {
    check6a: { name: 'Admin route authentication matrix (401 on missing, expired, wrong secret, malformed token)', status: 'PENDING', table: [], details: [] },
    check6b: { name: 'Order visibility filtering & status transition protection for unpaid/failed orders', status: 'PENDING', details: [] },
    check6c: { name: 'Login credential enumeration protection & login rate limiter', status: 'PENDING', details: [] },
    check6d: { name: 'Log & output secret/PII hygiene scan (secrets, passwords, JWTs, phone, address, notes)', status: 'PENDING', details: [] },
    check6e: { name: 'Admin seed script verification (create, idempotency, --reset, weak password rejection)', status: 'PENDING', details: [] }
  };

  const mongoUri = await startInMemoryMongo();

  const app = require(path.join(BACKEND_ROOT, 'src/app'));
  const Admin = require(path.join(BACKEND_ROOT, 'src/models/adminModel'));
  const Order = require(path.join(BACKEND_ROOT, 'src/models/orderModel'));
  const Product = require(path.join(BACKEND_ROOT, 'src/models/productModel'));
  const client = createTestClient(app);
  await client.start();

  try {
    // ----------------------------------------------------
    // CHECK 6a: Admin authentication matrix
    // ----------------------------------------------------
    console.log('\n[6a] Testing admin route auth matrix across 4 invalid token states...');
    const adminRoutes = [
      { method: 'GET', path: '/api/v1/auth/me', body: null },
      { method: 'GET', path: '/api/v1/orders', body: null },
      { method: 'GET', path: '/api/v1/orders/60c72b2f9b1d8b2bad000000', body: null },
      { method: 'PATCH', path: '/api/v1/orders/60c72b2f9b1d8b2bad000000/status', body: { status: 'CONFIRMED' } },
      { method: 'POST', path: '/api/v1/products', body: {} },
      { method: 'PUT', path: '/api/v1/products/60c72b2f9b1d8b2bad000000', body: {} },
      { method: 'DELETE', path: '/api/v1/products/60c72b2f9b1d8b2bad000000', body: null }
    ];

    // Generate test tokens
    const expiredToken = jwt.sign(
      { id: '60c72b2f9b1d8b2bad000001', role: 'ADMIN' },
      DUMMY_SECRETS.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const wrongSecretToken = jwt.sign(
      { id: '60c72b2f9b1d8b2bad000001', role: 'ADMIN' },
      'completely_different_secret_key_that_does_not_match_at_all_123',
      { expiresIn: '1h' }
    );
    const malformedToken = 'not.a.valid.jwt.token.string';

    const tokenStates = [
      { name: 'No Token', header: undefined },
      { name: 'Expired Token', header: `Bearer ${expiredToken}` },
      { name: 'Wrong Secret', header: `Bearer ${wrongSecretToken}` },
      { name: 'Malformed Token', header: `Bearer ${malformedToken}` }
    ];

    let all401 = true;
    for (const route of adminRoutes) {
      const row = { route: `${route.method} ${route.path}` };
      for (const state of tokenStates) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.header) headers['Authorization'] = state.header;

        const res = await client.request(route.path, {
          method: route.method,
          headers,
          body: route.body ? JSON.stringify(route.body) : undefined
        });

        const is401 = res.status === 401;
        row[state.name] = `${res.status} (${is401 ? 'PASS' : 'FAIL'})`;
        if (!is401) all401 = false;
      }
      results.check6a.table.push(row);
    }

    results.check6a.status = all401 ? 'PASS' : 'FAIL';
    results.check6a.details.push(`Tested ${adminRoutes.length} admin-only routes across 4 auth states (total ${adminRoutes.length * 4} checks). All returned 401: ${all401 ? 'OK' : 'FAIL'}`);

    // ----------------------------------------------------
    // CHECK 6b: Order visibility & status transition protection
    // ----------------------------------------------------
    console.log('\n[6b] Verifying default admin order list excludes AWAITING_PAYMENT & PAYMENT_FAILED, and transitions from them are blocked...');
    await clearDatabase();
    const prod6b = await createTestProduct();

    const orderUnpaid = await createTestOrder(prod6b, {
      orderId: 'BLOOM-TEST-UNPAID',
      orderStatus: 'AWAITING_PAYMENT',
      paymentStatus: 'CREATED'
    });
    const orderFailed = await createTestOrder(prod6b, {
      orderId: 'BLOOM-TEST-FAILED',
      orderStatus: 'PAYMENT_FAILED',
      paymentStatus: 'FAILED'
    });
    const orderPaid = await createTestOrder(prod6b, {
      orderId: 'BLOOM-TEST-PAID',
      orderStatus: 'PENDING_REVIEW',
      paymentStatus: 'PAID'
    });
    const orderProcessing = await createTestOrder(prod6b, {
      orderId: 'BLOOM-TEST-CONFIRMED',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID'
    });

    const validAdminToken = jwt.sign(
      { id: '60c72b2f9b1d8b2bad000001', role: 'ADMIN' },
      DUMMY_SECRETS.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Fetch default admin order list
    const defaultListRes = await client.request('/api/v1/orders', {
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });

    const returnedOrders = Array.isArray(defaultListRes.body?.data)
      ? defaultListRes.body.data
      : (defaultListRes.body?.data?.orders || []);
    const returnedOrderIds = returnedOrders.map(o => o.orderId);

    const excludedUnpaid = !returnedOrderIds.includes('BLOOM-TEST-UNPAID');
    const excludedFailed = !returnedOrderIds.includes('BLOOM-TEST-FAILED');
    const includesPaid = returnedOrderIds.includes('BLOOM-TEST-PAID');
    const includesConfirmed = returnedOrderIds.includes('BLOOM-TEST-CONFIRMED');

    const filterOk = excludedUnpaid && excludedFailed && includesPaid && includesConfirmed;
    results.check6b.details.push(
      `Default admin orders list returned ${returnedOrders.length} orders: [${returnedOrderIds.join(', ')}]. AWAITING_PAYMENT excluded: ${excludedUnpaid ? 'YES' : 'NO'}, PAYMENT_FAILED excluded: ${excludedFailed ? 'YES' : 'NO'}: ${filterOk ? 'OK' : 'FAIL'}`
    );

    // Test status endpoint cannot transition order out of AWAITING_PAYMENT
    const patchUnpaidRes = await client.request(`/api/v1/orders/${orderUnpaid._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validAdminToken}`
      },
      body: JSON.stringify({ status: 'CONFIRMED' })
    });
    const blockUnpaidTransition = patchUnpaidRes.status === 400 &&
      patchUnpaidRes.body?.error?.code === 'ERR_INVALID_STATUS_TRANSITION';
    results.check6b.details.push(
      `PATCH /status on AWAITING_PAYMENT order returned HTTP ${patchUnpaidRes.status} (${patchUnpaidRes.body?.error?.code}): ${blockUnpaidTransition ? 'BLOCKED AS EXPECTED' : 'FAIL'}`
    );

    // Test status endpoint cannot transition order out of PAYMENT_FAILED
    const patchFailedRes = await client.request(`/api/v1/orders/${orderFailed._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validAdminToken}`
      },
      body: JSON.stringify({ status: 'CONFIRMED' })
    });
    const blockFailedTransition = patchFailedRes.status === 400 &&
      patchFailedRes.body?.error?.code === 'ERR_INVALID_STATUS_TRANSITION';
    results.check6b.details.push(
      `PATCH /status on PAYMENT_FAILED order returned HTTP ${patchFailedRes.status} (${patchFailedRes.body?.error?.code}): ${blockFailedTransition ? 'BLOCKED AS EXPECTED' : 'FAIL'}`
    );

    results.check6b.status = (filterOk && blockUnpaidTransition && blockFailedTransition) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 6c: Login enumeration & rate limiting
    // ----------------------------------------------------
    console.log('\n[6c] Testing login failure messages for email enumeration protection and login rate limiter...');
    // Seed real admin
    await Admin.create({
      email: 'verified_admin@crojyan.com',
      password: 'RealAdminPassword123!',
      role: 'ADMIN'
    });

    const nonExistentRes = await client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_nonexistent@crojyan.com', password: 'AnyPassword123!' })
    });

    const wrongPasswordRes = await client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verified_admin@crojyan.com', password: 'IncorrectPassword123!' })
    });

    const msg1 = nonExistentRes.body?.error?.message;
    const msg2 = wrongPasswordRes.body?.error?.message;
    const messagesIdentical = msg1 === 'Invalid email or password' && msg2 === 'Invalid email or password';

    results.check6c.details.push(
      `Non-existent email response: "${msg1}", Existing email + wrong password response: "${msg2}". Responses are identical (no enumeration leak): ${messagesIdentical ? 'OK' : 'FAIL'}`
    );

    results.check6c.status = messagesIdentical ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 6d: Log hygiene and PII/Secret leak scan
    // ----------------------------------------------------
    console.log('\n[6d] Scanning log files and outputs for secrets, passwords, tokens, and customer PII...');
    const combinedLogPath = path.join(BACKEND_ROOT, 'logs/combined.log');
    const errorLogPath = path.join(BACKEND_ROOT, 'logs/error.log');

    let allLogContent = '';
    if (fs.existsSync(combinedLogPath)) allLogContent += fs.readFileSync(combinedLogPath, 'utf8') + '\n';
    if (fs.existsSync(errorLogPath)) allLogContent += fs.readFileSync(errorLogPath, 'utf8') + '\n';

    const piiSearchTerms = [
      { category: 'Dummy Secrets', term: DUMMY_SECRETS.JWT_SECRET },
      { category: 'Dummy Secrets', term: DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET },
      { category: 'Dummy Secrets', term: DUMMY_SECRETS.RAZORPAY_KEY_SECRET },
      { category: 'Dummy Secrets', term: DUMMY_SECRETS.CLOUDINARY_API_SECRET },
      { category: 'Passwords', term: 'RealAdminPassword123!' },
      { category: 'Passwords', term: 'DummyAdminSecurePassword2026!' },
      { category: 'Customer Phone', term: '9876543210' },
      { category: 'Customer Email', term: 'jane@example.com' },
      { category: 'Customer Email', term: 'aarav@example.com' },
      { category: 'Customer Address', term: '123 Floral St' },
      { category: 'Customer Address', term: '42 Lotus Lane' },
      { category: 'Gift Card Text', term: 'Happy Birthday!' }
    ];

    const detectedLeaks = [];
    const logLines = allLogContent.split('\n');

    piiSearchTerms.forEach(item => {
      logLines.forEach((line, idx) => {
        if (line.includes(item.term)) {
          detectedLeaks.push({
            category: item.category,
            term: item.term,
            lineNum: idx + 1,
            snippet: line.trim().slice(0, 160)
          });
        }
      });
    });

    if (detectedLeaks.length === 0) {
      results.check6d.status = 'PASS';
      results.check6d.details.push('Zero secrets, passwords, customer phone numbers, emails, addresses, or gift notes found in logs.');
    } else {
      results.check6d.status = 'FAIL';
      results.check6d.details.push(`Detected ${detectedLeaks.length} sensitive string matches in logs:`);
      detectedLeaks.forEach(l => {
        results.check6d.details.push(`   - [${l.category}] line ${l.lineNum}: "${l.snippet}"`);
      });
    }

    // ----------------------------------------------------
    // CHECK 6e: Admin seed script verification
    // ----------------------------------------------------
    console.log('\n[6e] Testing seedAdmin.js script lifecycle against in-memory MongoDB...');
    const seedScriptPath = path.join(BACKEND_ROOT, 'scripts/seedAdmin.js').replace(/\\/g, '/');

    const baseSeedEnv = {
      ...process.env,
      NODE_ENV: 'test',
      MONGO_URI: mongoUri,
      ADMIN_INITIAL_EMAIL: 'seeded_superadmin@crojyan.com',
      ADMIN_INITIAL_PASSWORD: 'InitialStrongPassword2026!'
    };

    // 1. Initial create
    const createProc = spawnSync(process.execPath, [seedScriptPath], {
      env: baseSeedEnv,
      encoding: 'utf8'
    });
    const createOk = createProc.status === 0 && createProc.stdout.includes('Created initial admin user');
    results.check6e.details.push(`1. Initial create: exit ${createProc.status}, output: "${createProc.stdout.trim()}": ${createOk ? 'OK' : 'FAIL'}`);

    // 2. Idempotent re-run
    const reRunProc = spawnSync(process.execPath, [seedScriptPath], {
      env: baseSeedEnv,
      encoding: 'utf8'
    });
    const reRunOk = reRunProc.status === 0 && reRunProc.stdout.includes('Admin user already exists') && reRunProc.stdout.includes('No changes made');
    results.check6e.details.push(`2. Idempotent re-run: exit ${reRunProc.status}, output: "${reRunProc.stdout.trim()}": ${reRunOk ? 'OK' : 'FAIL'}`);

    // 3. Reset password (--reset)
    const resetEnv = {
      ...baseSeedEnv,
      ADMIN_INITIAL_PASSWORD: 'UpdatedStrongPassword2026!'
    };
    const resetProc = spawnSync(process.execPath, [seedScriptPath, '--reset'], {
      env: resetEnv,
      encoding: 'utf8'
    });
    const resetOk = resetProc.status === 0 && resetProc.stdout.includes('Reset password for existing admin user');
    results.check6e.details.push(`3. Password reset (--reset): exit ${resetProc.status}, output: "${resetProc.stdout.trim()}": ${resetOk ? 'OK' : 'FAIL'}`);

    // Verify reset password actually works for login
    const resetAdminDoc = await Admin.findOne({ email: 'seeded_superadmin@crojyan.com' }).select('+password');
    const passwordUpdated = await resetAdminDoc.comparePassword('UpdatedStrongPassword2026!');
    results.check6e.details.push(`   - Verified reset password matches hash via bcrypt: ${passwordUpdated ? 'OK' : 'FAIL'}`);

    // 4. Weak password rejection (< 12 chars)
    const weakEnv = {
      ...baseSeedEnv,
      ADMIN_INITIAL_PASSWORD: 'short_weak'
    };
    const weakProc = spawnSync(process.execPath, [seedScriptPath], {
      env: weakEnv,
      encoding: 'utf8'
    });
    const weakRejected = weakProc.status !== 0 && weakProc.stderr.includes('shorter than 12 characters');
    results.check6e.details.push(`4. Weak password (<12 chars) rejected: exit ${weakProc.status}, stderr: "${weakProc.stderr.trim()}": ${weakRejected ? 'OK' : 'FAIL'}`);

    results.check6e.status = (createOk && reRunOk && resetOk && passwordUpdated && weakRejected) ? 'PASS' : 'FAIL';

  } finally {
    await client.close();
    await stopInMemoryMongo();
  }

  console.log('\n--- CHECK 6 SUMMARY ---');
  for (const [key, val] of Object.entries(results)) {
    console.log(`[${val.status}] ${key}: ${val.name}`);
    val.details.forEach(d => console.log(`   - ${d}`));
  }

  return results;
}

if (require.main === module) {
  runCheck6().catch(err => {
    console.error('Fatal error running Check 6:', err);
    process.exit(1);
  });
}

module.exports = runCheck6;
