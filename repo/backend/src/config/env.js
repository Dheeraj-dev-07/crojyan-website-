const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

if (nodeEnv === 'production') {
  requiredEnvVars.push('CLIENT_URL');
}

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `[FATAL ERROR] Missing required environment variable(s): ${missingEnvVars.join(', ')}`
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error(
    '[FATAL ERROR] JWT_SECRET must be at least 32 characters long for cryptographic security.'
  );
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminInitialEmail: process.env.ADMIN_INITIAL_EMAIL || 'admin@crojyan.com',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  }
};
