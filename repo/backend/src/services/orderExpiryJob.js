const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const logger = require('../config/logger');
const { ORDER_STATUSES, PAYMENT_STATUSES } = require('../constants/orderStatuses');

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const EXPIRY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

const cleanupExpiredOrders = async () => {
  try {
    const cutoffTime = new Date(Date.now() - EXPIRY_THRESHOLD_MS);

    const expiredOrders = await Order.find({
      orderStatus: ORDER_STATUSES.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUSES.CREATED,
      createdAt: { $lt: cutoffTime }
    });

    if (expiredOrders.length === 0) return;

    logger.info(`Order Expiry Job: Found ${expiredOrders.length} expired unpaid orders.`);

    for (const order of expiredOrders) {
      order.paymentStatus = PAYMENT_STATUSES.EXPIRED;
      order.orderStatus = ORDER_STATUSES.PAYMENT_FAILED;
      await order.save();

      // Restore stock for items
      for (const item of order.items) {
        try {
          if (item.bouquetId) {
            await Product.findByIdAndUpdate(item.bouquetId, {
              $inc: { stockCount: item.quantity },
              $set: { availability: 'available' }
            });
          }
        } catch (err) {
          logger.error(`Failed to restore stock for item ${item.bouquetId}: ${err.message}`);
        }
      }

      logger.info(`Expired Order ${order.orderId} and restored reserved stock.`);
    }
  } catch (error) {
    logger.error(`Error running order expiry cleanup job: ${error.message}`);
  }
};

const startOrderExpiryJob = () => {
  logger.info('Starting periodic Order Expiry Cleanup Job (runs every 10 minutes)...');
  cleanupExpiredOrders();
  setInterval(cleanupExpiredOrders, CLEANUP_INTERVAL_MS);
};

module.exports = {
  startOrderExpiryJob,
  cleanupExpiredOrders
};
