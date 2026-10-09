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

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
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
  getOrderById,
  updateOrderStatus
};
