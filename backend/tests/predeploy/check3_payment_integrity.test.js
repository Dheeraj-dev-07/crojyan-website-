const path = require('path');
const crypto = require('crypto');
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

async function runCheck3() {
  console.log('====================================================');
  console.log('CHECK 3: PAYMENT ROUTE INTEGRITY VERIFICATION');
  console.log('====================================================');

  const results = {
    check3a: { name: 'create-order: server-side price computation & price/sold_out tampering rejection', status: 'PENDING', details: [] },
    check3b: { name: 'Atomic stock reservation concurrency (20 parallel requests) & rollback on Razorpay failure', status: 'PENDING', details: [] },
    check3c: { name: 'verify-payment: timingSafeEqual signature check, tampering rejection, and idempotency', status: 'PENDING', details: [] },
    check3d: { name: 'Legacy POST /api/v1/orders route returns 404', status: 'PENDING', details: [] }
  };

  await startInMemoryMongo();

  const app = require(path.join(BACKEND_ROOT, 'src/app'));
  const Product = require(path.join(BACKEND_ROOT, 'src/models/productModel'));
  const Order = require(path.join(BACKEND_ROOT, 'src/models/orderModel'));
  const razorpayInstance = require(path.join(BACKEND_ROOT, 'src/config/razorpay'));
  const client = createTestClient(app);
  await client.start();

  try {
    // ----------------------------------------------------
    // CHECK 3a: Server-side pricing & tampering immunity
    // ----------------------------------------------------
    console.log('\n[3a] Verifying server-side price computation and tampering immunity...');
    await clearDatabase();
    const liveProd3a = await createTestProduct({ basePrice: 1499, stockCount: 15 });

    let capturedRzpOrderPayload = null;
    razorpayInstance.orders.create = async (payload) => {
      capturedRzpOrderPayload = payload;
      return {
        id: `order_mock_${Math.random().toString(36).substring(7)}`,
        amount: payload.amount,
        currency: payload.currency,
        status: 'created'
      };
    };

    // Customer sends order with tampering attempts: amount: 100, price: 10, total: 50, unitPrice: 1
    const customerPayload = {
      customer: {
        fullName: 'Aarav TamperTest',
        phone: '9876543210',
        email: 'aarav@example.com',
        deliveryAddress: { addressLine: '12 MG Road', city: 'Indore', state: 'MP', postalCode: '452001' }
      },
      items: [{
        productId: liveProd3a._id.toString(),
        quantity: 2,
        selectedCustomization: { ribbonColor: 'Gold', wrappingPaperShade: 'Ivory' },
        // Tampered fields:
        price: 10,
        unitPrice: 1
      }],
      // Extra tampered root fields:
      amount: 100,
      total: 50
    };

    const res3a = await client.request('/api/v1/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerPayload)
    });

    const expectedTotalINR = 1499 * 2; // 2998 INR
    const expectedAmountPaise = expectedTotalINR * 100; // 299800 paise

    const amountSentToRazorpay = capturedRzpOrderPayload ? capturedRzpOrderPayload.amount : null;
    const priceComputedCorrectly = res3a.status === 201 && amountSentToRazorpay === expectedAmountPaise;

    results.check3a.details.push(
      `Amount sent to Razorpay: ${amountSentToRazorpay} paise (expected ${expectedAmountPaise} paise based on DB basePrice 1499 * 2). Tampered fields (amount, total, price, unitPrice) were ignored: ${priceComputedCorrectly ? 'OK' : 'FAIL'}`
    );

    // Test stale items: sold_out product
    const soldOutProd = await createTestProduct({ basePrice: 999, stockCount: 0, availability: 'sold_out' });
    const soldOutOrderPayload = {
      customer: customerPayload.customer,
      items: [{
        productId: soldOutProd._id.toString(),
        quantity: 1,
        selectedCustomization: { ribbonColor: 'Gold', wrappingPaperShade: 'Ivory' }
      }]
    };
    const resSoldOut = await client.request('/api/v1/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(soldOutOrderPayload)
    });

    const soldOutRejected = resSoldOut.status === 400 && resSoldOut.body?.error?.code === 'ERR_STALE_CART_ITEM';
    results.check3a.details.push(
      `Sold out product returned HTTP ${resSoldOut.status} with code '${resSoldOut.body?.error?.code}' (expected ERR_STALE_CART_ITEM): ${soldOutRejected ? 'OK' : 'FAIL'}`
    );

    // Test removed/nonexistent product
    const nonExistentPayload = {
      customer: customerPayload.customer,
      items: [{
        productId: '60c72b2f9b1d8b2bad000000',
        quantity: 1,
        selectedCustomization: { ribbonColor: 'Gold', wrappingPaperShade: 'Ivory' }
      }]
    };
    const resNonExistent = await client.request('/api/v1/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nonExistentPayload)
    });
    const nonExistentRejected = resNonExistent.status === 400 && resNonExistent.body?.error?.code === 'ERR_STALE_CART_ITEM';
    results.check3a.details.push(
      `Non-existent product returned HTTP ${resNonExistent.status} with code '${resNonExistent.body?.error?.code}' (expected ERR_STALE_CART_ITEM): ${nonExistentRejected ? 'OK' : 'FAIL'}`
    );

    results.check3a.status = (priceComputedCorrectly && soldOutRejected && nonExistentRejected) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 3b: Atomic stock reservation concurrency & rollback
    // ----------------------------------------------------
    console.log('\n[3b] Testing atomic stock reservation concurrency (20 parallel requests for stock 10) and rollback on Razorpay failure...');
    await clearDatabase();
    const stockProduct = await createTestProduct({ stockCount: 10, basePrice: 500 });

    razorpayInstance.orders.create = async (payload) => {
      return {
        id: `order_mock_${Math.random().toString(36).substring(7)}`,
        amount: payload.amount,
        currency: 'INR',
        status: 'created'
      };
    };

    const makeSingleCreateOrder = (idx) => {
      return client.request('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: `Customer Parallel ${idx}`,
            phone: '9876543210',
            email: `cust${idx}@example.com`,
            deliveryAddress: { addressLine: '123 Parallel St', city: 'Indore', state: 'MP', postalCode: '452001' }
          },
          items: [{
            productId: stockProduct._id.toString(),
            quantity: 1,
            selectedCustomization: { ribbonColor: 'Pink', wrappingPaperShade: 'Cream' }
          }]
        })
      });
    };

    console.log('Firing 20 parallel create-order requests for stock 10...');
    const parallelRequests = Array.from({ length: 20 }, (_, i) => makeSingleCreateOrder(i));
    const parallelResponses = await Promise.all(parallelRequests);

    const successCount = parallelResponses.filter(r => r.status === 201).length;
    const insufficientStockCount = parallelResponses.filter(
      r => r.status === 400 && r.body?.error?.code === 'ERR_INSUFFICIENT_STOCK'
    ).length;

    const finalStockProd = await Product.findById(stockProduct._id);
    const finalStock = finalStockProd.stockCount;

    const concurrencyOk = successCount === 10 && insufficientStockCount === 10 && finalStock === 0;
    results.check3b.details.push(
      `20 parallel requests on stock 10: ${successCount} succeeded (expected 10), ${insufficientStockCount} failed with ERR_INSUFFICIENT_STOCK (expected 10), final stock: ${finalStock} (expected 0): ${concurrencyOk ? 'OK' : 'FAIL'}`
    );

    // Test rollback if Razorpay call fails
    console.log('Testing stock rollback when Razorpay orders.create fails...');
    const rollbackProduct = await createTestProduct({ stockCount: 5, basePrice: 600 });
    razorpayInstance.orders.create = async () => {
      throw new Error('Simulated Razorpay Gateway Timeout 504');
    };

    const resRollback = await client.request('/api/v1/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          fullName: 'Rollback Tester',
          phone: '9876543210',
          email: 'rollback@example.com',
          deliveryAddress: { addressLine: '123 Test St', city: 'Indore', state: 'MP', postalCode: '452001' }
        },
        items: [{
          productId: rollbackProduct._id.toString(),
          quantity: 2,
          selectedCustomization: { ribbonColor: 'Gold', wrappingPaperShade: 'White' }
        }]
      })
    });

    const productAfterFailedRzp = await Product.findById(rollbackProduct._id);
    const rollbackOk = resRollback.status === 500 && productAfterFailedRzp.stockCount === 5;
    results.check3b.details.push(
      `Stock rollback on Razorpay failure: HTTP ${resRollback.status}, initial stock 5, reserved 2, final restored stock: ${productAfterFailedRzp.stockCount}: ${rollbackOk ? 'OK' : 'FAIL'}`
    );

    results.check3b.status = (concurrencyOk && rollbackOk) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 3c: verify-payment: timingSafeEqual, tampering & idempotency
    // ----------------------------------------------------
    console.log('\n[3c] Testing verify-payment signature verification, tampering, timingSafeEqual, and idempotency...');
    await clearDatabase();
    const prod3c = await createTestProduct({ stockCount: 5, basePrice: 750 });
    const order3c = await createTestOrder(prod3c, {
      razorpayOrderId: 'order_rzp_verify_3c',
      orderStatus: 'AWAITING_PAYMENT',
      paymentStatus: 'CREATED'
    });

    const rzpOrderId = order3c.razorpayOrderId;
    const rzpPaymentId = 'pay_rzp_test_3c';
    const validVerifyData = `${rzpOrderId}|${rzpPaymentId}`;
    const validVerifySig = crypto
      .createHmac('sha256', DUMMY_SECRETS.RAZORPAY_KEY_SECRET)
      .update(validVerifyData)
      .digest('hex');

    // 1. Confirm timingSafeEqual in source code
    const fs = require('fs');
    const cryptoUtilPath = path.join(BACKEND_ROOT, 'src/utils/cryptoUtil.js');
    const cryptoUtilContent = fs.readFileSync(cryptoUtilPath, 'utf8');
    const hasTimingSafeEqual = cryptoUtilContent.includes('crypto.timingSafeEqual');
    const timingSafeEqualLine = cryptoUtilContent.split('\n').findIndex(l => l.includes('crypto.timingSafeEqual')) + 1;
    results.check3c.details.push(
      `crypto.timingSafeEqual check: Present at repo/backend/src/utils/cryptoUtil.js:line ${timingSafeEqualLine}`
    );

    // 2. Tampered signature
    const tamperedSigRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: 'tampered_signature_hex_value_1234567890abcdef'
      })
    });
    const tamperedSigRejected = tamperedSigRes.status === 400;
    results.check3c.details.push(
      `Tampered signature rejected with HTTP ${tamperedSigRes.status} (expected 400): ${tamperedSigRejected ? 'OK' : 'FAIL'}`
    );

    // 3. Tampered payment ID
    const tamperedPayIdRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: 'pay_tampered_different_id',
        razorpay_signature: validVerifySig
      })
    });
    const tamperedPayIdRejected = tamperedPayIdRes.status === 400;
    results.check3c.details.push(
      `Tampered payment ID rejected with HTTP ${tamperedPayIdRes.status} (expected 400): ${tamperedPayIdRejected ? 'OK' : 'FAIL'}`
    );

    // 4. Tampered order ID
    const tamperedOrderIdRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: 'order_tampered_different_id',
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: validVerifySig
      })
    });
    const tamperedOrderIdRejected = tamperedOrderIdRes.status === 400;
    results.check3c.details.push(
      `Tampered order ID rejected with HTTP ${tamperedOrderIdRes.status} (expected 400): ${tamperedOrderIdRejected ? 'OK' : 'FAIL'}`
    );

    // 5. Valid verify payment
    const validVerifyRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: validVerifySig
      })
    });
    const orderAfterVerify = await Order.findById(order3c._id);
    const validVerifyOk = validVerifyRes.status === 200 && orderAfterVerify.paymentStatus === 'PAID';
    results.check3c.details.push(
      `Valid verify-payment request returned HTTP ${validVerifyRes.status} and marked order PAID: ${validVerifyOk ? 'OK' : 'FAIL'}`
    );

    // 6. Idempotent second call
    const secondVerifyRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: validVerifySig
      })
    });
    const orderAfterSecond = await Order.findById(order3c._id);
    const idempotentOk = secondVerifyRes.status === 200 && orderAfterSecond.paymentStatus === 'PAID';
    results.check3c.details.push(
      `Second verify-payment call returned HTTP ${secondVerifyRes.status} idempotently (order remains PAID): ${idempotentOk ? 'OK' : 'FAIL'}`
    );

    results.check3c.status = (hasTimingSafeEqual && tamperedSigRejected && tamperedPayIdRejected && tamperedOrderIdRejected && validVerifyOk && idempotentOk) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 3d: Confirm legacy POST /api/v1/orders returns 404
    // ----------------------------------------------------
    console.log('\n[3d] Confirming legacy POST /api/v1/orders returns 404...');
    const legacyOrdersRes = await client.request('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: {}, items: [] })
    });
    const legacy404 = legacyOrdersRes.status === 404;
    results.check3d.details.push(
      `POST /api/v1/orders returned HTTP ${legacyOrdersRes.status} (expected 404 Not Found): ${legacy404 ? 'OK' : 'FAIL'}`
    );
    results.check3d.status = legacy404 ? 'PASS' : 'FAIL';

  } finally {
    await client.close();
    await stopInMemoryMongo();
  }

  console.log('\n--- CHECK 3 SUMMARY ---');
  for (const [key, val] of Object.entries(results)) {
    console.log(`[${val.status}] ${key}: ${val.name}`);
    val.details.forEach(d => console.log(`   - ${d}`));
  }

  return results;
}

if (require.main === module) {
  runCheck3().catch(err => {
    console.error('Fatal error running Check 3:', err);
    process.exit(1);
  });
}

module.exports = runCheck3;
