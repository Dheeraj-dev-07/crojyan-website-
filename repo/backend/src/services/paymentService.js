const mongoose = require('mongoose');
const razorpayInstance = require('../config/razorpay');
const env = require('../config/env');
const logger = require('../config/logger');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { ORDER_STATUSES, PAYMENT_STATUSES } = require('../constants/orderStatuses');
const { verifyHmacSha256 } = require('../utils/cryptoUtil');

const generateOrderId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BLOOM-${dateStr}-${randomSuffix}`;
};

// Helper to restore reserved stock for items with 'available' status
const restoreReservedStock = async (items) => {
  for (const item of items) {
    try {
      const prodId = item.productId || item.bouquetId;
      if (!prodId) continue;
      const product = await Product.findById(prodId);
      if (product) {
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stockCount: item.quantity },
          $set: { availability: 'available' }
        });
      }
    } catch (err) {
      logger.error(`Failed to restore stock for item ${item.productId}: ${err.message}`);
    }
  }
};

const createPaymentOrder = async (orderPayload) => {
  const { customer, items } = orderPayload;

  if (!razorpayInstance) {
    throw new AppError(
      'Razorpay payment gateway is currently unavailable',
      500,
      ERROR_CODES.ERR_RAZORPAY_ORDER_FAILED
    );
  }

  const staleItems = [];
  const processedSnapshots = [];
  let calculatedTotalINR = 0;
  const reservedStockTracker = [];

  // Step 1: Re-fetch every product from MongoDB & compute total SERVER-SIDE
  for (const item of items) {
    const liveProduct = await Product.findById(item.productId);

    if (!liveProduct) {
      staleItems.push({
        productId: item.productId,
        reason: 'PRODUCT_REMOVED',
        message: 'This bouquet is no longer available in our store.'
      });
      continue;
    }

    if (liveProduct.availability === 'sold_out') {
      staleItems.push({
        productId: item.productId,
        title: liveProduct.title,
        reason: 'SOLD_OUT',
        message: `${liveProduct.title} is currently sold out.`
      });
      continue;
    }

    const itemUnitPrice = liveProduct.basePrice;
    const itemSubtotal = itemUnitPrice * item.quantity;
    calculatedTotalINR += itemSubtotal;

    processedSnapshots.push({
      bouquetId: liveProduct._id,
      bouquetTitle: liveProduct.title,
      selectedCustomization: item.selectedCustomization,
      quantity: item.quantity,
      unitPrice: itemUnitPrice
    });
  }

  // Reject if any cart item is stale or sold out
  if (staleItems.length > 0) {
    throw new AppError(
      'Your cart contains items with updated prices or availability. Please review your cart.',
      400,
      ERROR_CODES.ERR_STALE_CART_ITEM,
      staleItems
    );
  }

  // Step 2: Atomically reserve stock for 'available' items
  try {
    for (const item of items) {
      const liveProduct = await Product.findById(item.productId);
      if (liveProduct && liveProduct.availability === 'available') {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: liveProduct._id,
            availability: 'available',
            stockCount: { $gte: item.quantity }
          },
          {
            $inc: { stockCount: -item.quantity }
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw new AppError(
            `Insufficient stock for ${liveProduct.title}. Only ${liveProduct.stockCount} remaining.`,
            400,
            ERROR_CODES.ERR_INSUFFICIENT_STOCK,
            {
              productId: liveProduct._id,
              requested: item.quantity,
              availableStock: liveProduct.stockCount
            }
          );
        }

        reservedStockTracker.push({ productId: liveProduct._id, quantity: item.quantity });

        // Auto mark as sold_out if stock hits 0
        if (updatedProduct.stockCount === 0) {
          updatedProduct.availability = 'sold_out';
          await updatedProduct.save();
        }
      }
    }

    // Step 3: Create initial Order document in Mongo
    const internalOrderId = generateOrderId();
    const newOrder = new Order({
      orderId: internalOrderId,
      customer,
      items: processedSnapshots,
      totalPrice: calculatedTotalINR,
      orderStatus: ORDER_STATUSES.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUSES.CREATED
    });

    const totalAmountInPaise = Math.round(calculatedTotalINR * 100);

    // Step 4: Call Razorpay API to create order
    let rzpOrder;
    try {
      rzpOrder = await razorpayInstance.orders.create({
        amount: totalAmountInPaise,
        currency: 'INR',
        receipt: newOrder._id.toString(),
        notes: {
          orderId: internalOrderId,
          customerEmail: customer.email
        }
      });
    } catch (rzpErr) {
      logger.error(`Razorpay orders.create API failed: ${rzpErr.message}`);
      throw new AppError(
        'Failed to initiate payment order with Razorpay gateway',
        500,
        ERROR_CODES.ERR_RAZORPAY_ORDER_FAILED
      );
    }

    newOrder.razorpayOrderId = rzpOrder.id;
    await newOrder.save();

    logger.info(`Created Razorpay order ${rzpOrder.id} for internal order ${internalOrderId}`);

    return {
      orderId: newOrder.orderId,
      mongoId: newOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount: totalAmountInPaise,
      currency: 'INR',
      keyId: env.razorpay.keyId
    };
  } catch (error) {
    // Rollback stock reservation on failure
    if (reservedStockTracker.length > 0) {
      await restoreReservedStock(reservedStockTracker);
    }
    throw error;
  }
};

const verifyPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const dataString = `${razorpay_order_id}|${razorpay_payment_id}`;
  const isValid = verifyHmacSha256(dataString, razorpay_signature, env.razorpay.keySecret);

  if (!isValid) {
    logger.warn(`Payment signature verification failed for Razorpay order ${razorpay_order_id}`);
    throw new AppError(
      'Payment verification failed: Signature mismatch',
      400,
      ERROR_CODES.ERR_PAYMENT_VERIFICATION_FAILED
    );
  }

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (!order) {
    throw new AppError('Order not found for payment verification', 404, ERROR_CODES.ERR_ORDER_NOT_FOUND);
  }

  // Idempotent handling if already marked paid
  if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
    return { orderId: order.orderId, status: 'PAID' };
  }

  order.paymentStatus = PAYMENT_STATUSES.PAID;
  order.paidAt = new Date();
  order.razorpayPaymentId = razorpay_payment_id;
  order.orderStatus = ORDER_STATUSES.PENDING_REVIEW;

  await order.save();
  logger.info(`Payment verified successfully for Order ${order.orderId} (Payment ID: ${razorpay_payment_id})`);

  return {
    orderId: order.orderId,
    status: 'PAID'
  };
};

const handleWebhookEvent = async (rawBodyBuffer, signatureHeader) => {
  const rawBodyString = rawBodyBuffer ? rawBodyBuffer.toString('utf8') : '';
  const isValid = verifyHmacSha256(rawBodyString, signatureHeader, env.razorpay.webhookSecret);

  if (!isValid) {
    logger.warn('Razorpay webhook signature verification failed');
    throw new AppError('Invalid webhook signature', 400, ERROR_CODES.ERR_WEBHOOK_SIGNATURE_INVALID);
  }

  let eventData;
  try {
    eventData = JSON.parse(rawBodyString);
  } catch (err) {
    throw new AppError('Invalid JSON in webhook payload', 400, ERROR_CODES.ERR_BAD_REQUEST);
  }

  const eventName = eventData.event;
  logger.info(`Processing Razorpay Webhook Event: ${eventName}`);

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    const rzpOrderId = eventData.payload?.payment?.entity?.order_id || eventData.payload?.order?.entity?.id;
    const rzpPaymentId = eventData.payload?.payment?.entity?.id;

    if (rzpOrderId) {
      const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
      if (order && order.paymentStatus !== PAYMENT_STATUSES.PAID) {
        order.paymentStatus = PAYMENT_STATUSES.PAID;
        order.paidAt = new Date();
        if (rzpPaymentId) order.razorpayPaymentId = rzpPaymentId;
        order.orderStatus = ORDER_STATUSES.PENDING_REVIEW;
        await order.save();
        logger.info(`Webhook updated Order ${order.orderId} to PAID`);
      }
    }
  } else if (eventName === 'payment.failed') {
    const rzpOrderId = eventData.payload?.payment?.entity?.order_id;
    if (rzpOrderId) {
      const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
      if (order && order.paymentStatus !== PAYMENT_STATUSES.PAID && order.paymentStatus !== PAYMENT_STATUSES.FAILED) {
        order.paymentStatus = PAYMENT_STATUSES.FAILED;
        order.orderStatus = ORDER_STATUSES.PAYMENT_FAILED;
        await order.save();

        // Restore reserved stock for available items
        await restoreReservedStock(order.items);
        logger.info(`Webhook updated Order ${order.orderId} to PAYMENT_FAILED and restored stock`);
      }
    }
  }

  return { status: 'success' };
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhookEvent,
  restoreReservedStock
};
