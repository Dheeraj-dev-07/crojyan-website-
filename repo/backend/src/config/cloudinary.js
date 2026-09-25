const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('./env');
const logger = require('./logger');

const isCloudinaryConfigured =
  env.cloudinary.cloudName &&
  env.cloudinary.cloudName !== 'demo' &&
  env.cloudinary.apiKey &&
  env.cloudinary.apiKey !== '123456789' &&
  env.cloudinary.apiSecret;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret
  });
  logger.info('Cloudinary SDK configured successfully.');
} else {
  logger.info('Cloudinary credentials not provided or default. Using local upload fallback mode.');
}

let storage;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'crochet_bouquets',
      allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
    }
  });
} else {
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `bouquet-${uniqueSuffix}${ext}`);
    }
  });
}

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    if (isCloudinaryConfigured) {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`Deleted image from Cloudinary: ${publicId}`);
    } else {
      logger.info(`Local fallback mode: purge image metadata for ${publicId}`);
    }
  } catch (error) {
    logger.error(`Failed to delete image ${publicId}: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  storage,
  isCloudinaryConfigured,
  deleteCloudinaryImage
};
