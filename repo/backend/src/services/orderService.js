const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { ORDER_STATUSES, ALLOWED_ORDER_TRANSITIONS } = require('../constants/orderStatuses');

/*
 * STOCK HANDLING RULE:
 * - 'available' items MUST have sufficient stockCount in DB and are atomically decremented upon order creation.
 * - 'made_to_order' items skip stock checks and atomic decrements entirely.
 * - 'sold_out' items immediately reject order creation with ERR_STALE_CART_ITEM.
 */

const generateOrderId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BLOOM-${dateStr}-${randomSuffix}`;
};

const createOrder = async (orderPayload) => {
  const { customer, items } = orderPayload;

  const staleItems = [];
  const processedSnapshots = [];
  let calculatedTotal = 0;

  // Step 1: Re-validate every cart item against current database state
  for (const item of items) {
    const liveProduct = await Product.findById(item.bouquetId);

    if (!liveProduct) {
      staleItems.push({
        bouquetId: item.bouquetId,
        reason: 'PRODUCT_REMOVED',
        message: 'This bouquet is no longer available in our store.'
      });
      continue;
    }

    if (liveProduct.availability === 'sold_out') {
      staleItems.push({
        bouquetId: item.bouquetId,
        title: liveProduct.title,
        reason: 'SOLD_OUT',
        message: `${liveProduct.title} is currently sold out.`
      });
      continue;
    }

    // Compare prices (allow slight precision tolerance if needed, but exact comparison for base + delta)
    if (Math.abs(liveProduct.basePrice - item.unitPrice) > 0.01) {
      staleItems.push({
        bouquetId: item.bouquetId,
        title: liveProduct.title,
        reason: 'PRICE_CHANGED',
        oldUnitPrice: item.unitPrice,
        currentUnitPrice: liveProduct.basePrice,
        message: `The price for ${liveProduct.title} updated from $${item.unitPrice} to $${liveProduct.basePrice}.`
      });
      continue;
    }

    // Step 2: Check stock for 'available' items
    if (liveProduct.availability === 'available') {
      if (liveProduct.stockCount < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${liveProduct.title}. Only ${liveProduct.stockCount} left.`,
          400,
          ERROR_CODES.ERR_INSUFFICIENT_STOCK,
          {
            bouquetId: liveProduct._id,
            requested: item.quantity,
            availableStock: liveProduct.stockCount
          }
        );
      }
    }

    const itemSubtotal = liveProduct.basePrice * item.quantity;
    calculatedTotal += itemSubtotal;

    processedSnapshots.push({
      bouquetId: liveProduct._id,
      bouquetTitle: liveProduct.title,
      selectedCustomization: item.selectedCustomization,
      quantity: item.quantity,
      unitPrice: liveProduct.basePrice
    });
  }

  // If any item was stale, reject transaction immediately
  if (staleItems.length > 0) {
    throw new AppError(
      'Your cart contains items with updated prices or availability. Please review your cart.',
      400,
      ERROR_CODES.ERR_STALE_CART_ITEM,
      staleItems
    );
  }

  // Step 3: Atomic stock decrement for 'available' items
  for (const item of items) {
    const liveProduct = await Product.findById(item.bouquetId);
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
          `Stock changed concurrently for ${liveProduct.title}. Please try again.`,
          400,
          ERROR_CODES.ERR_INSUFFICIENT_STOCK
        );
      }

      // If stock reached 0 after decrement, set status to sold_out automatically
      if (updatedProduct.stockCount === 0) {
        updatedProduct.availability = 'sold_out';
        await updatedProduct.save();
      }
    }
  }

  // Step 4: Create order with snapshot and PENDING_REVIEW status
  const newOrder = await Order.create({
    orderId: generateOrderId(),
    customer,
    items: processedSnapshots,
    totalPrice: calculatedTotal,
    orderStatus: ORDER_STATUSES.PENDING_REVIEW
  });

  return newOrder;
};

const getOrders = async (queryFilters = {}) => {
  const { status, page = 1, limit = 15 } = queryFilters;

  const filterCriteria = {};
  if (status && Object.values(ORDER_STATUSES).includes(status)) {
    filterCriteria.orderStatus = status;
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
  const order = await Order.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { orderId }] });
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
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
