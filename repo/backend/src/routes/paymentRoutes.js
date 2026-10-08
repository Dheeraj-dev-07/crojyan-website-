const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { createPaymentOrderSchema, verifyPaymentSchema } = require('../validators/paymentValidator');
const validateRequest = require('../middleware/validateMiddleware');
const { paymentRateLimiter } = require('../middleware/rateLimiter');

router.post(
  '/create-order',
  paymentRateLimiter,
  validateRequest(createPaymentOrderSchema),
  paymentController.createOrder
);

router.post(
  '/verify-payment',
  paymentRateLimiter,
  validateRequest(verifyPaymentSchema),
  paymentController.verifyPayment
);

module.exports = router;
