const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { ORDER_STATUSES, ALLOWED_ORDER_TRANSITIONS } = require('../constants/orderStatuses');

const getOrders = async (queryFilters = {}) => {
  const { status, includePending, includeAll, page = 1, limit = 15 } = queryFilters;

  const filterCriteria = {};
  if (status && Object.values(ORDER_STATUSES).includes(status)) {
    filterCriteria.orderStatus = status;
  } else if (includePending !== 'true' && includeAll !== 'true') {
    // Exclude AWAITING_PAYMENT and PAYMENT_FAILED by default for clean admin view
    filterCriteria.orderStatus = {
      $nin: [ORDER_STATUSES.AWAITING_PAYMENT, ORDER_STATUSES.PAYMENT_FAILED]
    };
  }

  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const pageNum = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limitNum = Number.isFinite(parsedLimit) ? Math.max(1, parsedLimit) : 15;
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalCount] = await Promise.all([
    Order.find(filterCriteria).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments(filterCriteria)
  ]);

  return {
    orders,
    meta: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    }
  };
};

const getSalesSummary = async (range = '30d') => {
  const ranges = {
    '7d': { days: 7, unit: 'day', dateFormat: '%Y-%m-%d' },
    '30d': { days: 30, unit: 'day', dateFormat: '%Y-%m-%d' },
    '12m': { months: 12, unit: 'month', dateFormat: '%Y-%m' }
  };
  const normalizedRange = Object.prototype.hasOwnProperty.call(ranges, range) ? range : '30d';
  const selectedRange = ranges[normalizedRange];
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (selectedRange.unit === 'month') {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (selectedRange.months - 1));
  } else {
    start.setUTCDate(start.getUTCDate() - selectedRange.days + 1);
  }

  // Older paid orders may predate paidAt; use createdAt for those records.
  const match = {
    paymentStatus: 'PAID',
    $or: [
      { paidAt: { $gte: start, $lte: now } },
      { paidAt: null, createdAt: { $gte: start, $lte: now } }
    ]
  };
  const salesDate = { $ifNull: ['$paidAt', '$createdAt'] };
  const [summary] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ]);
  const buckets = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: selectedRange.dateFormat, date: salesDate, timezone: 'UTC' } },
        revenue: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const bucketMap = new Map(buckets.map((bucket) => [bucket._id, bucket]));
  const completeBuckets = [];
  const cursor = new Date(start);
  const currentKey = selectedRange.unit === 'month'
    ? now.toISOString().slice(0, 7)
    : now.toISOString().slice(0, 10);
  while (true) {
    const key = selectedRange.unit === 'month'
      ? cursor.toISOString().slice(0, 7)
      : cursor.toISOString().slice(0, 10);
    if (key > currentKey) break;
    const bucket = bucketMap.get(key);
    completeBuckets.push({
      date: key,
      revenue: bucket?.revenue || 0,
      orderCount: bucket?.orderCount || 0
    });
    if (selectedRange.unit === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    range: normalizedRange,
    startDate: start.toISOString(),
    endDate: now.toISOString(),
    revenue: summary?.revenue || 0,
    orderCount: summary?.orderCount || 0,
    averageOrderValue: summary?.averageOrderValue || 0,
    buckets: completeBuckets
  };
};

const getOrderById = async (orderId) => {
  const order = await Order.findOne({
    $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderId }]
  });
  if (!order) {
    throw new AppError('Order not found', 404, ERROR_CODES.ERR_ORDER_NOT_FOUND);
  }
  return order;
};

const updateOrderStatus = async (orderId, newStatus) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404, ERROR_CODES.ERR_ORDER_NOT_FOUND);
  }

  const currentStatus = order.orderStatus;

  if (currentStatus === ORDER_STATUSES.AWAITING_PAYMENT || currentStatus === ORDER_STATUSES.PAYMENT_FAILED) {
    throw new AppError(
      `Admin cannot manually modify order status while in '${currentStatus}'`,
      400,
      ERROR_CODES.ERR_INVALID_STATUS_TRANSITION
    );
  }

  const allowedNext = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      `Cannot transition order status from '${currentStatus}' to '${newStatus}'`,
      400,
      ERROR_CODES.ERR_INVALID_STATUS_TRANSITION,
      {
        currentStatus,
        requestedStatus: newStatus,
        allowedTransitions: allowedNext
      }
    );
  }

  order.orderStatus = newStatus;
  await order.save();

  return order;
};

module.exports = {
  getOrders,
  getSalesSummary,
  getOrderById,
  updateOrderStatus
};
