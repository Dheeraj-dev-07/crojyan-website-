const paymentService = require('../services/paymentService');
const { sendSuccess } = require('../utils/responseHandler');

const createOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentOrder(req.body);
    return sendSuccess(res, 201, result, null, 'Payment order created successfully');
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.body);
    return sendSuccess(res, 200, result, null, 'Payment verified successfully');
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-razorpay-signature'];
    const result = await paymentService.handleWebhookEvent(req.body, signatureHeader);
    return res.status(200).json({ status: 'ok', ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook
};
