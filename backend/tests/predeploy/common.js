const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');

// Locate backend root (supports repo/backend layout)
const BACKEND_ROOT = fs.existsSync(path.resolve(__dirname, '../../../repo/backend'))
  ? path.resolve(__dirname, '../../../repo/backend')
  : path.resolve(__dirname, '../..');

// Add node_modules from backend
const nodeModulesPath = path.join(BACKEND_ROOT, 'node_modules');
if (!module.paths.includes(nodeModulesPath)) {
  module.paths.unshift(nodeModulesPath);
}
const Module = require('module');
if (!Module.globalPaths.includes(nodeModulesPath)) {
  Module.globalPaths.unshift(nodeModulesPath);
}

// Dummy secrets (strictly dummy, never read from real .env)
const DUMMY_SECRETS = {
  JWT_SECRET: 'dummy_predeploy_jwt_secret_over_32_characters_crojyan_2026',
  RAZORPAY_KEY_ID: 'rzp_test_dummy_key_12345',
  RAZORPAY_KEY_SECRET: 'dummy_rzp_key_secret_dummy_12345',
  RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret_dummy',
  CLOUDINARY_CLOUD_NAME: 'dummy_cloudinary_cloud',
  CLOUDINARY_API_KEY: 'dummy_cloudinary_api_key_123',
  CLOUDINARY_API_SECRET: 'dummy_cloudinary_secret_123',
  CLIENT_URL: 'http://localhost:5173',
  ADMIN_INITIAL_EMAIL: 'dummy_admin@crojyan.com',
  ADMIN_INITIAL_PASSWORD: 'DummyAdminSecurePassword2026!'
};

// Set dummy environment variables before requiring any app modules
function setDummyEnv(overrides = {}) {
  process.env.NODE_ENV = overrides.NODE_ENV || 'test';
  process.env.PORT = overrides.PORT || '0';
  process.env.JWT_SECRET = overrides.JWT_SECRET || DUMMY_SECRETS.JWT_SECRET;
  process.env.RAZORPAY_KEY_ID = overrides.RAZORPAY_KEY_ID || DUMMY_SECRETS.RAZORPAY_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = overrides.RAZORPAY_KEY_SECRET || DUMMY_SECRETS.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = overrides.RAZORPAY_WEBHOOK_SECRET || DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET;
  process.env.CLOUDINARY_CLOUD_NAME = overrides.CLOUDINARY_CLOUD_NAME || DUMMY_SECRETS.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_API_KEY = overrides.CLOUDINARY_API_KEY || DUMMY_SECRETS.CLOUDINARY_API_KEY;
  process.env.CLOUDINARY_API_SECRET = overrides.CLOUDINARY_API_SECRET || DUMMY_SECRETS.CLOUDINARY_API_SECRET;
  process.env.CLIENT_URL = overrides.CLIENT_URL || DUMMY_SECRETS.CLIENT_URL;
  process.env.ADMIN_INITIAL_EMAIL = overrides.ADMIN_INITIAL_EMAIL || DUMMY_SECRETS.ADMIN_INITIAL_EMAIL;
  process.env.ADMIN_INITIAL_PASSWORD = overrides.ADMIN_INITIAL_PASSWORD || DUMMY_SECRETS.ADMIN_INITIAL_PASSWORD;
  if (overrides.MONGO_URI) {
    process.env.MONGO_URI = overrides.MONGO_URI;
  }
}

setDummyEnv();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServerInstance = null;

async function startInMemoryMongo() {
  if (!mongoServerInstance) {
    mongoServerInstance = await MongoMemoryServer.create();
    const uri = mongoServerInstance.getUri();
    process.env.MONGO_URI = uri;
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  return mongoServerInstance.getUri();
}

async function stopInMemoryMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServerInstance) {
    await mongoServerInstance.stop();
    mongoServerInstance = null;
  }
}

async function clearDatabase() {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

function signWebhookBody(bodyString, secret = DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
}

// Log capture utility
const capturedLogs = [];
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

function startLogCapture() {
  capturedLogs.length = 0;
  process.stdout.write = (chunk, ...args) => {
    capturedLogs.push({ type: 'stdout', text: chunk.toString() });
    return originalStdoutWrite(chunk, ...args);
  };
  process.stderr.write = (chunk, ...args) => {
    capturedLogs.push({ type: 'stderr', text: chunk.toString() });
    return originalStderrWrite(chunk, ...args);
  };
}

function stopLogCapture() {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  return capturedLogs;
}

function getCapturedLogs() {
  return capturedLogs;
}

// Helper to spawn ephemeral HTTP server from express app and send requests
function createTestClient(app) {
  let server = null;
  let baseUrl = '';

  const start = () => {
    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve(baseUrl);
      });
    });
  };

  const close = () => {
    return new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  };

  const request = async (route, options = {}) => {
    if (!server) await start();
    const url = `${baseUrl}${route}`;
    const startHr = process.hrtime.bigint();
    const res = await fetch(url, options);
    const durationMs = Number(process.hrtime.bigint() - startHr) / 1e6;

    let bodyText = '';
    let json = null;
    try {
      bodyText = await res.text();
      json = JSON.parse(bodyText);
    } catch (e) {
      // not JSON
    }

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      durationMs,
      text: bodyText,
      body: json
    };
  };

  return {
    start,
    close,
    request,
    getBaseUrl: () => baseUrl
  };
}

async function createTestProduct(overrides = {}) {
  const Product = require(path.join(BACKEND_ROOT, 'src/models/productModel'));
  const uniqueId = Math.random().toString(36).substring(7);
  return await Product.create({
    title: overrides.title || `Test Bouquet ${uniqueId}`,
    slug: overrides.slug || `test-bouquet-${uniqueId}`,
    description: overrides.description || 'Artisanal handcrafted crochet bouquet for tests',
    basePrice: overrides.basePrice !== undefined ? overrides.basePrice : 899,
    stemCount: overrides.stemCount !== undefined ? overrides.stemCount : 6,
    stockCount: overrides.stockCount !== undefined ? overrides.stockCount : 10,
    availability: overrides.availability || 'available',
    defaultLeadTimeDays: overrides.defaultLeadTimeDays !== undefined ? overrides.defaultLeadTimeDays : 3,
    images: overrides.images || [
      {
        url: 'https://res.cloudinary.com/dummy/image/upload/sample.jpg',
        public_id: `test_image_${uniqueId}`,
        isPrimary: true,
        order: 0
      }
    ],
    dimensions: overrides.dimensions || { heightCm: 32, widthCm: 22 },
    customization: overrides.customization || {
      ribbonColors: ['Blush Pink', 'Champagne Gold'],
      wrappingPaperShades: ['Soft Cream', 'Pastel Pink']
    }
  });
}

async function createTestOrder(product, overrides = {}) {
  const Order = require(path.join(BACKEND_ROOT, 'src/models/orderModel'));
  const uniqueId = Math.random().toString(36).substring(7);
  const qty = overrides.quantity || 1;
  const price = product.basePrice || 899;
  return await Order.create({
    orderId: overrides.orderId || `BLOOM-TEST-${uniqueId.toUpperCase()}`,
    customer: overrides.customer || {
      fullName: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav@example.com',
      deliveryAddress: {
        addressLine: '42 Lotus Lane, Vijay Nagar',
        city: 'Indore',
        state: 'Madhya Pradesh',
        postalCode: '452010'
      }
    },
    items: overrides.items || [
      {
        bouquetId: product._id,
        bouquetTitle: product.title,
        selectedCustomization: {
          ribbonColor: 'Blush Pink',
          wrappingPaperShade: 'Soft Cream',
          giftCardText: 'Happy Birthday!'
        },
        quantity: qty,
        unitPrice: price
      }
    ],
    totalPrice: overrides.totalPrice !== undefined ? overrides.totalPrice : price * qty,
    orderStatus: overrides.orderStatus || 'AWAITING_PAYMENT',
    paymentStatus: overrides.paymentStatus || 'CREATED',
    razorpayOrderId: overrides.razorpayOrderId || `order_test_${uniqueId}`,
    razorpayPaymentId: overrides.razorpayPaymentId || undefined
  });
}

module.exports = {
  BACKEND_ROOT,
  DUMMY_SECRETS,
  setDummyEnv,
  startInMemoryMongo,
  stopInMemoryMongo,
  clearDatabase,
  signWebhookBody,
  startLogCapture,
  stopLogCapture,
  getCapturedLogs,
  createTestClient,
  createTestProduct,
  createTestOrder
};

