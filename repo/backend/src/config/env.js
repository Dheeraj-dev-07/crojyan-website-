const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crochet_bouquet_db',
  jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret_bloom_loop_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminInitialEmail: process.env.ADMIN_INITIAL_EMAIL || 'admin@crojyan.com',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Crojyan@73951206',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_key_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_placeholder_webhook_secret'
  }
};
