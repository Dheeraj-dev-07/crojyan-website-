const path = require('path');
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

async function runCheck2() {
  console.log('====================================================');
  console.log('CHECK 2: EVENT SEQUENCES AGAINST THE REAL HANDLER');
  console.log('====================================================');

  await startInMemoryMongo();

  const app = require(path.join(BACKEND_ROOT, 'src/app'));
  const Order = require(path.join(BACKEND_ROOT, 'src/models/orderModel'));
  const Product = require(path.join(BACKEND_ROOT, 'src/models/productModel'));
  const { cleanupExpiredOrders } = require(path.join(BACKEND_ROOT, 'src/services/orderExpiryJob'));
  const client = createTestClient(app);
  await client.start();

  const sequenceResults = [];

  const sendWebhookEvent = async (eventObj) => {
    const bodyStr = JSON.stringify(eventObj);
    const sig = signWebhookBody(bodyStr, DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET);
    return await client.request('/api/v1/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': sig
      },
      body: bodyStr
    });
  };

  try {
    // ----------------------------------------------------
    // Scenario 1: payment.captured delivered twice
    // ----------------------------------------------------
    console.log('\n[Scenario 1] payment.captured delivered twice...');
    await clearDatabase();
    const p1 = await createTestProduct({ stockCount: 8 });
    const o1 = await createTestOrder(p1, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evCaptured1 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_1_1', order_id: o1.razorpayOrderId, amount: o1.totalPrice * 100, status: 'captured' } }
      }
    };

    const res1a = await sendWebhookEvent(evCaptured1);
    const res1b = await sendWebhookEvent(evCaptured1);

    const updatedO1 = await Order.findById(o1._id);
    const updatedP1 = await Product.findById(p1._id);

    const issues1 = [];
    if (updatedO1.paymentStatus !== 'PAID') issues1.push(`Expected PAID, got ${updatedO1.paymentStatus}`);
    if (updatedP1.stockCount !== 8) issues1.push(`Stock changed unexpectedly: ${updatedP1.stockCount}`);

    sequenceResults.push({
      caseNum: 1,
      caseTitle: 'payment.captured delivered twice',
      httpStatuses: [res1a.status, res1b.status],
      finalPaymentStatus: updatedO1.paymentStatus,
      finalOrderStatus: updatedO1.orderStatus,
      finalStockCount: updatedP1.stockCount,
      anomalies: issues1,
      verdict: issues1.length === 0 ? 'PASS' : 'FAIL',
      notes: 'Second captured delivery is ignored idempotently without modifying state or stock.'
    });

    // ----------------------------------------------------
    // Scenario 2: payment.captured delivered 5 times concurrently
    // ----------------------------------------------------
    console.log('\n[Scenario 2] payment.captured delivered 5 times concurrently...');
    await clearDatabase();
    const p2 = await createTestProduct({ stockCount: 8 });
    const o2 = await createTestOrder(p2, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evCaptured2 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_2_1', order_id: o2.razorpayOrderId, amount: o2.totalPrice * 100, status: 'captured' } }
      }
    };

    const responses2 = await Promise.all([
      sendWebhookEvent(evCaptured2),
      sendWebhookEvent(evCaptured2),
      sendWebhookEvent(evCaptured2),
      sendWebhookEvent(evCaptured2),
      sendWebhookEvent(evCaptured2)
    ]);

    const updatedO2 = await Order.findById(o2._id);
    const updatedP2 = await Product.findById(p2._id);

    const issues2 = [];
    const non200s = responses2.filter(r => r.status !== 200);
    if (non200s.length > 0) {
      issues2.push(`Concurrent requests had non-200 responses: ${responses2.map(r => r.status).join(', ')}`);
    }
    if (updatedO2.paymentStatus !== 'PAID') issues2.push(`Order paymentStatus is not PAID: ${updatedO2.paymentStatus}`);
    if (updatedP2.stockCount !== 8) issues2.push(`Stock modified unexpectedly: ${updatedP2.stockCount}`);

    sequenceResults.push({
      caseNum: 2,
      caseTitle: 'payment.captured delivered 5 times concurrently (same event)',
      httpStatuses: responses2.map(r => r.status),
      finalPaymentStatus: updatedO2.paymentStatus,
      finalOrderStatus: updatedO2.orderStatus,
      finalStockCount: updatedP2.stockCount,
      anomalies: issues2,
      verdict: issues2.length === 0 ? 'PASS' : 'FAIL',
      notes: issues2.length === 0
        ? 'All 5 concurrent requests settled cleanly to PAID with HTTP 200; stock untouched.'
        : 'Potential Mongoose VersionError or race condition under concurrency.'
    });

    // ----------------------------------------------------
    // Scenario 3: payment.failed THEN payment.captured for the same razorpay_order_id
    // ----------------------------------------------------
    console.log('\n[Scenario 3] payment.failed THEN payment.captured (customer retried and paid)...');
    await clearDatabase();
    const p3 = await createTestProduct({ stockCount: 8 });
    const o3 = await createTestOrder(p3, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evFailed3 = {
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_seq_3_failed', order_id: o3.razorpayOrderId, amount: o3.totalPrice * 100, status: 'failed' } }
      }
    };
    const evCaptured3 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_3_captured', order_id: o3.razorpayOrderId, amount: o3.totalPrice * 100, status: 'captured' } }
      }
    };

    const res3Failed = await sendWebhookEvent(evFailed3);
    const orderAfterFailed = await Order.findById(o3._id);
    const productAfterFailed = await Product.findById(p3._id);

    const res3Captured = await sendWebhookEvent(evCaptured3);
    const updatedO3 = await Order.findById(o3._id);
    const updatedP3 = await Product.findById(p3._id);

    const issues3 = [];
    // CRITICAL CHECK: In payment.failed, stock was restored (8 + 2 = 10).
    // When payment.captured arrives afterward, order transitions to PAID, BUT stock is currently 10!
    // Stock was restored for an order that is now PAID! That is an inventory oversell bug!
    if (updatedO3.paymentStatus === 'PAID' && updatedP3.stockCount === 10) {
      issues3.push(
        'CRITICAL INVENTORY DISCREPANCY: Stock was restored (+2) on payment.failed, but subsequent payment.captured marked the order PAID without re-reserving stock. The paid order now has stock restored in inventory (10 instead of 8), allowing double-selling!'
      );
    }
    if (updatedO3.paymentStatus !== 'PAID') {
      issues3.push(`Paid customer ended in unconfirmed state: ${updatedO3.paymentStatus}`);
    }

    sequenceResults.push({
      caseNum: 3,
      caseTitle: 'payment.failed THEN payment.captured for same razorpay_order_id (customer retried and paid)',
      httpStatuses: [res3Failed.status, res3Captured.status],
      finalPaymentStatus: updatedO3.paymentStatus,
      finalOrderStatus: updatedO3.orderStatus,
      finalStockCount: updatedP3.stockCount,
      anomalies: issues3,
      verdict: issues3.length === 0 ? 'PASS' : 'FAIL',
      notes: `Order state transitioned CREATED -> FAILED -> PAID. Stock after failure: ${productAfterFailed.stockCount}, Stock after capture: ${updatedP3.stockCount}.`
    });

    // ----------------------------------------------------
    // Scenario 4: payment.captured THEN a late payment.failed
    // ----------------------------------------------------
    console.log('\n[Scenario 4] payment.captured THEN a late payment.failed...');
    await clearDatabase();
    const p4 = await createTestProduct({ stockCount: 8 });
    const o4 = await createTestOrder(p4, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evCaptured4 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_4_captured', order_id: o4.razorpayOrderId, amount: o4.totalPrice * 100, status: 'captured' } }
      }
    };
    const evLateFailed4 = {
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_seq_4_old_failed', order_id: o4.razorpayOrderId, amount: o4.totalPrice * 100, status: 'failed' } }
      }
    };

    const res4Captured = await sendWebhookEvent(evCaptured4);
    const res4LateFailed = await sendWebhookEvent(evLateFailed4);

    const updatedO4 = await Order.findById(o4._id);
    const updatedP4 = await Product.findById(p4._id);

    const issues4 = [];
    if (updatedO4.paymentStatus !== 'PAID') {
      issues4.push(`CRITICAL: A paid order was downgraded to ${updatedO4.paymentStatus} by a late payment.failed webhook!`);
    }
    if (updatedP4.stockCount !== 8) {
      issues4.push(`CRITICAL: Stock was erroneously restored for a paid order! Stock: ${updatedP4.stockCount}`);
    }

    sequenceResults.push({
      caseNum: 4,
      caseTitle: 'payment.captured THEN a late payment.failed (an older failed attempt arriving afterward)',
      httpStatuses: [res4Captured.status, res4LateFailed.status],
      finalPaymentStatus: updatedO4.paymentStatus,
      finalOrderStatus: updatedO4.orderStatus,
      finalStockCount: updatedP4.stockCount,
      anomalies: issues4,
      verdict: issues4.length === 0 ? 'PASS' : 'FAIL',
      notes: 'Late payment.failed correctly rejected because order.paymentStatus === PAID. Stock not modified.'
    });

    // ----------------------------------------------------
    // Scenario 5: payment.failed delivered twice
    // ----------------------------------------------------
    console.log('\n[Scenario 5] payment.failed delivered twice...');
    await clearDatabase();
    const p5 = await createTestProduct({ stockCount: 8 });
    const o5 = await createTestOrder(p5, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evFailed5 = {
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_seq_5_failed', order_id: o5.razorpayOrderId, amount: o5.totalPrice * 100, status: 'failed' } }
      }
    };

    const res5a = await sendWebhookEvent(evFailed5);
    const res5b = await sendWebhookEvent(evFailed5);

    const updatedO5 = await Order.findById(o5._id);
    const updatedP5 = await Product.findById(p5._id);

    const issues5 = [];
    if (updatedO5.paymentStatus !== 'FAILED') {
      issues5.push(`Expected paymentStatus FAILED, got ${updatedO5.paymentStatus}`);
    }
    if (updatedP5.stockCount !== 10) {
      issues5.push(`Stock count should be restored exactly once (expected 10), but got ${updatedP5.stockCount}`);
    }

    sequenceResults.push({
      caseNum: 5,
      caseTitle: 'payment.failed delivered twice (stock must be restored once only)',
      httpStatuses: [res5a.status, res5b.status],
      finalPaymentStatus: updatedO5.paymentStatus,
      finalOrderStatus: updatedO5.orderStatus,
      finalStockCount: updatedP5.stockCount,
      anomalies: issues5,
      verdict: issues5.length === 0 ? 'PASS' : 'FAIL',
      notes: 'Stock was restored once (8 -> 10). Second delivery saw paymentStatus === FAILED and ignored idempotently.'
    });

    // ----------------------------------------------------
    // Scenario 6: order.paid and payment.captured both arriving for the same order
    // ----------------------------------------------------
    console.log('\n[Scenario 6] order.paid and payment.captured both arriving for the same order...');
    await clearDatabase();
    const p6 = await createTestProduct({ stockCount: 8 });
    const o6 = await createTestOrder(p6, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const evOrderPaid6 = {
      event: 'order.paid',
      payload: {
        order: { entity: { id: o6.razorpayOrderId, amount: o6.totalPrice * 100, status: 'paid' } },
        payment: { entity: { id: 'pay_seq_6_pay', order_id: o6.razorpayOrderId, amount: o6.totalPrice * 100, status: 'captured' } }
      }
    };
    const evPaymentCaptured6 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_6_pay', order_id: o6.razorpayOrderId, amount: o6.totalPrice * 100, status: 'captured' } }
      }
    };

    const res6a = await sendWebhookEvent(evOrderPaid6);
    const res6b = await sendWebhookEvent(evPaymentCaptured6);

    const updatedO6 = await Order.findById(o6._id);
    const updatedP6 = await Product.findById(p6._id);

    const issues6 = [];
    if (updatedO6.paymentStatus !== 'PAID') issues6.push(`Expected PAID, got ${updatedO6.paymentStatus}`);
    if (updatedP6.stockCount !== 8) issues6.push(`Stock changed unexpectedly: ${updatedP6.stockCount}`);

    sequenceResults.push({
      caseNum: 6,
      caseTitle: 'order.paid and payment.captured both arriving for the same order (single transition)',
      httpStatuses: [res6a.status, res6b.status],
      finalPaymentStatus: updatedO6.paymentStatus,
      finalOrderStatus: updatedO6.orderStatus,
      finalStockCount: updatedP6.stockCount,
      anomalies: issues6,
      verdict: issues6.length === 0 ? 'PASS' : 'FAIL',
      notes: 'Single clean transition from CREATED to PAID. Second event is a no-op.'
    });

    // ----------------------------------------------------
    // Scenario 7: payment.captured arriving AFTER order marked EXPIRED/PAYMENT_FAILED by cleanup job
    // ----------------------------------------------------
    console.log('\n[Scenario 7] payment.captured arriving AFTER order marked EXPIRED/PAYMENT_FAILED by 30-min cleanup job...');
    await clearDatabase();
    const p7 = await createTestProduct({ stockCount: 8 });
    // Seed an order created 35 minutes ago
    const thirtyFiveMinsAgo = new Date(Date.now() - 35 * 60 * 1000);
    const o7 = await createTestOrder(p7, {
      quantity: 2,
      orderStatus: 'AWAITING_PAYMENT',
      paymentStatus: 'CREATED'
    });
    // Manually set createdAt to 35 mins ago via native MongoDB collection (bypassing Mongoose timestamps hook)
    await Order.collection.updateOne({ _id: o7._id }, { $set: { createdAt: thirtyFiveMinsAgo } });

    // Run cleanup job
    await cleanupExpiredOrders();

    const orderAfterCleanup = await Order.findById(o7._id);
    const productAfterCleanup = await Product.findById(p7._id);

    // Now late payment.captured webhook arrives
    const evCaptured7 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_seq_7_late', order_id: o7.razorpayOrderId, amount: o7.totalPrice * 100, status: 'captured' } }
      }
    };
    const res7 = await sendWebhookEvent(evCaptured7);

    const updatedO7 = await Order.findById(o7._id);
    const updatedP7 = await Product.findById(p7._id);

    const issues7 = [];
    // The cleanup job marked order EXPIRED and restored stock (8 -> 10).
    // Now payment.captured marked order PAID (because order.paymentStatus !== PAID was true).
    // But stock was ALREADY released to inventory and not re-reserved!
    if (updatedO7.paymentStatus === 'PAID' && updatedP7.stockCount === 10) {
      issues7.push(
        'CRITICAL LATE PAYMENT INVENTORY LEAK: Order was expired by cleanup job and stock was restored (8 -> 10). Late payment.captured marked the order PAID, but stock remains released in inventory (10 instead of 8). Customer has a paid order with no reserved stock, leading to overselling!'
      );
    }

    sequenceResults.push({
      caseNum: 7,
      caseTitle: 'payment.captured arriving AFTER the order was marked EXPIRED/PAYMENT_FAILED by the 30-minute cleanup job (customer paid late)',
      httpStatuses: [res7.status],
      finalPaymentStatus: updatedO7.paymentStatus,
      finalOrderStatus: updatedO7.orderStatus,
      finalStockCount: updatedP7.stockCount,
      anomalies: issues7,
      verdict: issues7.length === 0 ? 'PASS' : 'FAIL',
      notes: `Cleanup job set status=${orderAfterCleanup.paymentStatus}, restored stock to ${productAfterCleanup.stockCount}. Late webhook updated paymentStatus to ${updatedO7.paymentStatus}, leaving stock at ${updatedP7.stockCount}.`
    });

    // ----------------------------------------------------
    // Scenario 8: verify-payment and webhook racing at the same moment for the same payment
    // ----------------------------------------------------
    console.log('\n[Scenario 8] verify-payment and webhook racing concurrently for the same payment...');
    await clearDatabase();
    const p8 = await createTestProduct({ stockCount: 8 });
    const o8 = await createTestOrder(p8, { quantity: 2, orderStatus: 'AWAITING_PAYMENT', paymentStatus: 'CREATED' });

    const razorpayPaymentId = 'pay_seq_8_racing';
    const verifyDataString = `${o8.razorpayOrderId}|${razorpayPaymentId}`;
    const validVerifySig = require(path.join(BACKEND_ROOT, 'src/utils/cryptoUtil')).verifyHmacSha256;
    const crypto = require('crypto');
    const verifySigHex = crypto.createHmac('sha256', DUMMY_SECRETS.RAZORPAY_KEY_SECRET).update(verifyDataString).digest('hex');

    const evCaptured8 = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: razorpayPaymentId, order_id: o8.razorpayOrderId, amount: o8.totalPrice * 100, status: 'captured' } }
      }
    };

    const [verifyRes, webhookRes] = await Promise.all([
      client.request('/api/v1/payments/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: o8.razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: verifySigHex
        })
      }),
      sendWebhookEvent(evCaptured8)
    ]);

    const updatedO8 = await Order.findById(o8._id);
    const updatedP8 = await Product.findById(p8._id);

    const issues8 = [];
    if (verifyRes.status !== 200) issues8.push(`verify-payment returned HTTP ${verifyRes.status}: ${JSON.stringify(verifyRes.body)}`);
    if (webhookRes.status !== 200) issues8.push(`webhook returned HTTP ${webhookRes.status}: ${JSON.stringify(webhookRes.body)}`);
    if (updatedO8.paymentStatus !== 'PAID') issues8.push(`Expected paymentStatus PAID, got ${updatedO8.paymentStatus}`);
    if (updatedP8.stockCount !== 8) issues8.push(`Stock changed unexpectedly: ${updatedP8.stockCount}`);

    sequenceResults.push({
      caseNum: 8,
      caseTitle: 'verify-payment and the webhook racing at the same moment for the same payment',
      httpStatuses: [verifyRes.status, webhookRes.status],
      finalPaymentStatus: updatedO8.paymentStatus,
      finalOrderStatus: updatedO8.orderStatus,
      finalStockCount: updatedP8.stockCount,
      anomalies: issues8,
      verdict: issues8.length === 0 ? 'PASS' : 'FAIL',
      notes: issues8.length === 0
        ? 'Both racing calls succeeded with HTTP 200, order finalized to PAID, stock untouched.'
        : `Race condition detected: ${issues8.join('; ')}`
    });

  } finally {
    await client.close();
    await stopInMemoryMongo();
  }

  console.log('\n--- CHECK 2 RESULTS ---');
  for (const s of sequenceResults) {
    console.log(`[${s.verdict}] Case ${s.caseNum}: ${s.caseTitle}`);
    console.log(`       Statuses: HTTP [${s.httpStatuses.join(', ')}] | paymentStatus: ${s.finalPaymentStatus} | orderStatus: ${s.finalOrderStatus} | stockCount: ${s.finalStockCount}`);
    if (s.anomalies.length > 0) {
      s.anomalies.forEach(a => console.log(`       ⚠️  ANOMALY: ${a}`));
    }
  }

  return sequenceResults;
}

if (require.main === module) {
  runCheck2().catch(err => {
    console.error('Fatal error running Check 2:', err);
    process.exit(1);
  });
}

module.exports = runCheck2;
