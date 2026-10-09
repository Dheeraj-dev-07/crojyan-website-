const Razorpay = require('razorpay');
const env = require('./env');
const logger = require('./logger');

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret
  });
  logger.info('Razorpay SDK client instance initialized successfully.');
} catch (error) {
  logger.error(`Failed to initialize Razorpay SDK: ${error.message}`);
}

module.exports = razorpayInstance;
