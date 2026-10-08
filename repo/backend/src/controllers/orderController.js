const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/responseHandler');

const getOrders = async (req, res, next) => {
  try {
    const { orders, meta } = await orderService.getOrders(req.query);
    return sendSuccess(res, 200, orders, meta, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    return sendSuccess(res, 200, order, null, 'Order details retrieved');
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await orderService.updateOrderStatus(id, status);
    return sendSuccess(res, 200, updatedOrder, null, `Order status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus
};
