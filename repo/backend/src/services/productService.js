const Product = require('../models/productModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { deleteCloudinaryImage } = require('../config/cloudinary');

const getAllProducts = async (queryFilters = {}) => {
  const { availability, priceMin, priceMax, page = 1, limit = 12 } = queryFilters;

  const filterCriteria = {};

  if (availability) {
    filterCriteria.availability = availability;
  }

  if (priceMin || priceMax) {
    filterCriteria.basePrice = {};
    if (priceMin) filterCriteria.basePrice.$gte = Number(priceMin);
    if (priceMax) filterCriteria.basePrice.$lte = Number(priceMax);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [products, totalCount] = await Promise.all([
    Product.find(filterCriteria).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Product.countDocuments(filterCriteria)
  ]);

  return {
    products,
    meta: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    }
  };
};

const getProductById = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Bouquet product not found', 404, ERROR_CODES.ERR_PRODUCT_NOT_FOUND);
  }
  return product;
};

const createProduct = async (productData, files = []) => {
  const imageObjects = files.map((file, idx) => ({
    url: file.path || file.secure_url || `/uploads/${file.filename}`,
    public_id: file.filename || file.public_id || `local-${Date.now()}-${idx}`,
    isPrimary: idx === 0
  }));

  if (imageObjects.length === 0) {
    // Provide default fallback image if none uploaded
    imageObjects.push({
      url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800',
      public_id: 'default-crochet-bouquet',
      isPrimary: true
    });
  }

  const newProduct = await Product.create({
    ...productData,
    images: imageObjects
  });

  return newProduct;
};

const updateProduct = async (productId, updateData, files = []) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Bouquet product not found', 404, ERROR_CODES.ERR_PRODUCT_NOT_FOUND);
  }

  if (files && files.length > 0) {
    const newImages = files.map((file, idx) => ({
      url: file.path || file.secure_url || `/uploads/${file.filename}`,
      public_id: file.filename || file.public_id || `local-${Date.now()}-${idx}`,
      isPrimary: product.images.length === 0 && idx === 0
    }));

    product.images.push(...newImages);
  }

  Object.assign(product, updateData);
  await product.save();

  return product;
};

const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Bouquet product not found', 404, ERROR_CODES.ERR_PRODUCT_NOT_FOUND);
  }

  // Purge Cloudinary images
  if (product.images && product.images.length > 0) {
    for (const img of product.images) {
      await deleteCloudinaryImage(img.public_id);
    }
  }

  await Product.findByIdAndDelete(productId);
  return { id: productId };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
