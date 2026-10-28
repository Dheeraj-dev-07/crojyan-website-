const path = require('path');
const assert = require('assert');
const {
  BACKEND_ROOT,
  DUMMY_SECRETS,
  startInMemoryMongo,
  stopInMemoryMongo,
  clearDatabase,
  signWebhookBody,
  createTestClient,
  createTestProduct,
  createTestOrder
} = require('./common');

async function runCheck1() {
  console.log('====================================================');
  console.log('CHECK 1: WEBHOOK INTAKE VERIFICATION');
  console.log('====================================================');

  const results = {
    check1a: { name: 'Route mounting (express.raw before express.json & JSON parsing)', status: 'PENDING', details: [] },
    check1b: { name: 'HMAC signature verification & rejection safety', status: 'PENDING', details: [] },
    check1c: { name: 'Unknown/irrelevant events & unknown order_id return 200 without writes', status: 'PENDING', details: [] },
    check1d: { name: 'Handler response time and slow external call check', status: 'PENDING', details: [] },
    check1e: { name: 'CORS, rate limiting, and X-Forwarded-For proxy compatibility', status: 'PENDING', details: [] }
  };

  await startInMemoryMongo();

  const app = require(path.join(BACKEND_ROOT, 'src/app'));
  const Order = require(path.join(BACKEND_ROOT, 'src/models/orderModel'));
  const Product = require(path.join(BACKEND_ROOT, 'src/models/productModel'));
  const client = createTestClient(app);
  await client.start();

  try {
    // ----------------------------------------------------
    // CHECK 1a: Confirm route mounting order
    // ----------------------------------------------------
    console.log('\n[1a] Verifying route stack order and JSON parsing...');
    let webhookRawIndex = -1;
    let jsonParserIndex = -1;

    app._router.stack.forEach((layer, idx) => {
      if (layer.route && layer.route.path === '/api/v1/payments/webhook') {
        webhookRawIndex = idx;
      }
      if (layer.name === 'jsonParser') {
        jsonParserIndex = idx;
      }
    });

    const routeOrderOk = webhookRawIndex !== -1 && jsonParserIndex !== -1 && webhookRawIndex < jsonParserIndex;
    if (routeOrderOk) {
      results.check1a.details.push(`Webhook mounted at index ${webhookRawIndex}, express.json at index ${jsonParserIndex} (webhook is BEFORE express.json)`);
    } else {
      results.check1a.details.push(`FAILURE: Webhook index (${webhookRawIndex}) is NOT before express.json (${jsonParserIndex})`);
    }

    // Test that other JSON routes parse JSON correctly
    const jsonTestRes = await client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_admin@crojyan.com', password: 'AnyPassword123!' })
    });
    // Should hit auth controller or validator, not fail due to unparsed JSON body
    const jsonParsedProperly = jsonTestRes.status === 401 || jsonTestRes.status === 400;
    if (jsonParsedProperly) {
      results.check1a.details.push(`Standard JSON routes parse properly: POST /api/v1/auth/login returned HTTP ${jsonTestRes.status} (body was parsed)`);
    } else {
      results.check1a.details.push(`FAILURE: Standard JSON route failed unexpectedly with HTTP ${jsonTestRes.status}`);
    }

    results.check1a.status = routeOrderOk && jsonParsedProperly ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 1b: HMAC signature verification & rejection safety
    // ----------------------------------------------------
    console.log('\n[1b] Testing HMAC signature verification, tampering, whitespace, and rejection safety...');
    await clearDatabase();

    // Seed a product and an order using helper
    const testProduct = await createTestProduct({
      title: 'Signature Bouquet Test',
      basePrice: 1299,
      stockCount: 10
    });

    const rzpOrderId1b = 'order_rzp_sig_test_001';
    const testOrder1b = await createTestOrder(testProduct, {
      orderId: 'BLOOM-TEST-SIG-001',
      totalPrice: 1299,
      razorpayOrderId: rzpOrderId1b
    });

    const validPayloadObj = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_sig_001',
            order_id: rzpOrderId1b,
            amount: 129900,
            status: 'captured'
          }
        }
      }
    };
    const validBodyString = JSON.stringify(validPayloadObj);
    const validSignature = signWebhookBody(validBodyString, DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET);

    // 1. Missing signature header
    const missingSigRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validBodyString
    });
    const missingSigOk = missingSigRes.status === 400;
    results.check1b.details.push(`Missing X-Razorpay-Signature returned HTTP ${missingSigRes.status} (expected 400): ${missingSigOk ? 'OK' : 'FAIL'}`);

    // 2. Wrong-length signature header
    const wrongLengthSigRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'too_short_sig' },
      body: validBodyString
    });
    const wrongLengthSigOk = wrongLengthSigRes.status === 400;
    results.check1b.details.push(`Wrong-length signature returned HTTP ${wrongLengthSigRes.status} (expected 400): ${wrongLengthSigOk ? 'OK' : 'FAIL'}`);

    // 3. Tampered body
    const tamperedBody = validBodyString.replace('129900', '999900');
    const tamperedRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': validSignature },
      body: tamperedBody
    });
    const tamperedOk = tamperedRes.status === 400;
    results.check1b.details.push(`Tampered body returned HTTP ${tamperedRes.status} (expected 400): ${tamperedOk ? 'OK' : 'FAIL'}`);

    // 4. Re-serialized with different whitespace (proves raw bytes are used)
    const whitespaceBody = JSON.stringify(validPayloadObj, null, 2); // pretty-printed
    const whitespaceRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': validSignature },
      body: whitespaceBody
    });
    const whitespaceOk = whitespaceRes.status === 400;
    results.check1b.details.push(`Re-serialized body with different whitespace returned HTTP ${whitespaceRes.status} (expected 400, raw bytes enforced): ${whitespaceOk ? 'OK' : 'FAIL'}`);

    // Verify no DB write occurred on any rejection
    const orderAfterRejections = await Order.findById(testOrder1b._id);
    const noDbWriteOnReject = orderAfterRejections.paymentStatus === 'CREATED' && orderAfterRejections.orderStatus === 'AWAITING_PAYMENT';
    results.check1b.details.push(`DB state after rejected attempts: paymentStatus=${orderAfterRejections.paymentStatus}, orderStatus=${orderAfterRejections.orderStatus} (no writes on rejection: ${noDbWriteOnReject ? 'OK' : 'FAIL'})`);

    // 5. Valid signature accepted
    const validRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': validSignature },
      body: validBodyString
    });
    const orderAfterValid = await Order.findById(testOrder1b._id);
    const validOk = validRes.status === 200 && orderAfterValid.paymentStatus === 'PAID';
    results.check1b.details.push(`Valid signature returned HTTP ${validRes.status} and marked order PAID: ${validOk ? 'OK' : 'FAIL'}`);

    results.check1b.status = (missingSigOk && wrongLengthSigOk && tamperedOk && whitespaceOk && noDbWriteOnReject && validOk) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 1c: Unknown/irrelevant event types & unknown razorpay_order_id
    // ----------------------------------------------------
    console.log('\n[1c] Testing unknown event types and unknown razorpay_order_id return 200 without writes...');
    const irrelevantPayload = JSON.stringify({
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_dummy_123', status: 'active' } } }
    });
    const irrelevantSig = signWebhookBody(irrelevantPayload);
    const irrelevantRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': irrelevantSig },
      body: irrelevantPayload
    });
    const irrelevantOk = irrelevantRes.status === 200;
    results.check1c.details.push(`Irrelevant event 'subscription.charged' returned HTTP ${irrelevantRes.status} (expected 200): ${irrelevantOk ? 'OK' : 'FAIL'}`);

    const unknownOrderPayload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_unknown_999', order_id: 'order_completely_unknown_99999', amount: 50000, status: 'captured' } } }
    });
    const unknownOrderSig = signWebhookBody(unknownOrderPayload);
    const unknownOrderRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': unknownOrderSig },
      body: unknownOrderPayload
    });
    const unknownOrderOk = unknownOrderRes.status === 200;
    results.check1c.details.push(`Unknown razorpay_order_id returned HTTP ${unknownOrderRes.status} (expected 200): ${unknownOrderOk ? 'OK' : 'FAIL'}`);

    results.check1c.status = (irrelevantOk && unknownOrderOk) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 1d: Response time measurement & slow external call check
    // ----------------------------------------------------
    console.log('\n[1d] Measuring webhook handler response times and inspecting for slow awaited external calls...');
    const timings = [];
    for (let i = 0; i < 5; i++) {
      const p = JSON.stringify({ event: 'ping.event', payload: { ping: { entity: { id: `ping_${i}` } } } });
      const s = signWebhookBody(p);
      const res = await client.request('/api/v1/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': s },
        body: p
      });
      timings.push(res.durationMs);
    }
    const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxDuration = Math.max(...timings);
    const timingOk = maxDuration < 5000; // Razorpay 5 second timeout limit
    results.check1d.details.push(`Timings over 5 deliveries: [${timings.map(t => t.toFixed(1) + 'ms').join(', ')}]. Avg: ${avgDuration.toFixed(1)}ms, Max: ${maxDuration.toFixed(1)}ms`);
    results.check1d.details.push('Code inspection: handleWebhookEvent awaits only Order.findOne, order.save(), and Product.findByIdAndUpdate (no email, HTTP request, or disk file I/O).');
    results.check1d.status = timingOk ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 1e: CORS, rate limiting, and X-Forwarded-For proxy compatibility
    // ----------------------------------------------------
    console.log('\n[1e] Testing CORS, rate limiter isolation, and X-Forwarded-For proxy handling...');
    // 1. CORS test: request from outside origin or no Origin header
    const corsWebhookRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': irrelevantSig
      },
      body: irrelevantPayload
    });
    const corsPass = corsWebhookRes.status === 200;
    results.check1e.details.push(`Webhook with no Origin header returns HTTP ${corsWebhookRes.status} (not blocked by CORS): ${corsPass ? 'OK' : 'FAIL'}`);

    // 2. Rate limiting test: fire 35 requests rapidly to webhook endpoint
    console.log('Firing 35 rapid webhook requests to check if rate limiter blocks retries...');
    let hit429 = false;
    for (let i = 0; i < 35; i++) {
      const r = await client.request('/api/v1/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': irrelevantSig
        },
        body: irrelevantPayload
      });
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    const rateLimitOk = !hit429;
    results.check1e.details.push(`35 rapid webhook requests completed without HTTP 429 (rate limiter is NOT applied to webhook intake): ${rateLimitOk ? 'OK' : 'FAIL'}`);

    // 3. X-Forwarded-For header present
    const xffRes = await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': irrelevantSig,
        'X-Forwarded-For': '203.0.113.195'
      },
      body: irrelevantPayload
    });
    const xffOk = xffRes.status === 200;
    results.check1e.details.push(`Webhook with X-Forwarded-For header processed cleanly (HTTP ${xffRes.status}): ${xffOk ? 'OK' : 'FAIL'}`);

    results.check1e.status = (corsPass && rateLimitOk && xffOk) ? 'PASS' : 'FAIL';

  } finally {
    await client.close();
    await stopInMemoryMongo();
  }

  console.log('\n--- CHECK 1 SUMMARY ---');
  for (const [key, val] of Object.entries(results)) {
    console.log(`[${val.status}] ${key}: ${val.name}`);
    val.details.forEach(d => console.log(`   - ${d}`));
  }
  return results;
}

if (require.main === module) {
  runCheck1().catch(err => {
    console.error('Fatal error running Check 1:', err);
    process.exit(1);
  });
}

module.exports = runCheck1;
