const Product = require('../models/productModel');
const AppError = require('../utils/AppError');
const ERROR_CODES = require('../constants/errorCodes');
const { deleteCloudinaryImage } = require('../config/cloudinary');

// Helper to sort product images by order ascending and ensure exactly one isPrimary
const sortAndNormalizeImages = (images = []) => {
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sorted.forEach((img, idx) => {
    img.order = idx;
  });

  const primaryCount = sorted.filter((img) => img.isPrimary).length;
  if (primaryCount !== 1 && sorted.length > 0) {
    sorted.forEach((img, idx) => {
      img.isPrimary = idx === 0;
    });
  }

  return sorted;
};

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

  // Ensure returned products have images sorted by order
  products.forEach((p) => {
    if (p.images && p.images.length > 0) {
      p.images.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
  });

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
  if (product.images && product.images.length > 0) {
    product.images.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return product;
};

const createProduct = async (productData, files = []) => {
  const newlyUploadedPublicIds = [];

  try {
    const imageObjects = files.map((file, idx) => {
      const pubId = file.filename || file.public_id || `local-${Date.now()}-${idx}`;
      newlyUploadedPublicIds.push(pubId);
      return {
        url: file.path || file.secure_url || `/uploads/${file.filename}`,
        public_id: pubId,
        isPrimary: idx === 0,
        order: idx
      };
    });

    let finalImages = imageObjects;

    if (finalImages.length === 0) {
      if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
        finalImages = productData.images;
      } else {
        // Fallback default image if none provided
        finalImages = [
          {
            url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800',
            public_id: 'default-crochet-bouquet',
            isPrimary: true,
            order: 0
          }
        ];
      }
    }

    finalImages = sortAndNormalizeImages(finalImages);

    const newProduct = await Product.create({
      ...productData,
      images: finalImages
    });

    return newProduct;
  } catch (error) {
    // Purge newly uploaded files from Cloudinary if DB create failed
    for (const pubId of newlyUploadedPublicIds) {
      await deleteCloudinaryImage(pubId);
    }
    throw error;
  }
};

const updateProduct = async (productId, updateData, files = []) => {
  const product = await Product.findById(productId);
  if (!product) {
    // Purge uploaded files if product doesn't exist
    if (files && files.length > 0) {
      for (const file of files) {
        const pubId = file.filename || file.public_id;
        await deleteCloudinaryImage(pubId);
      }
    }
    throw new AppError('Bouquet product not found', 404, ERROR_CODES.ERR_PRODUCT_NOT_FOUND);
  }

  const newlyUploadedPublicIds = [];

  try {
    let currentImages = [...(product.images || [])];

    // 1. Parse & handle removeImageIds
    let removeImageIds = updateData.removeImageIds;
    if (typeof removeImageIds === 'string') {
      try {
        removeImageIds = JSON.parse(removeImageIds);
      } catch (e) {
        removeImageIds = [removeImageIds];
      }
    }
    if (!Array.isArray(removeImageIds)) {
      removeImageIds = removeImageIds ? [removeImageIds] : [];
    }

    const imagesToKeep = [];
    const imagesToDelete = [];

    for (const img of currentImages) {
      if (removeImageIds.includes(img.public_id)) {
        imagesToDelete.push(img);
      } else {
        imagesToKeep.push(img);
      }
    }

    // 2. Add newly uploaded files
    const startOrder = imagesToKeep.length;
    const newImageObjects = (files || []).map((file, idx) => {
      const pubId = file.filename || file.public_id || `local-${Date.now()}-${idx}`;
      newlyUploadedPublicIds.push(pubId);
      return {
        url: file.path || file.secure_url || `/uploads/${file.filename}`,
        public_id: pubId,
        isPrimary: false,
        order: startOrder + idx
      };
    });

    const combinedImages = [...imagesToKeep, ...newImageObjects];

    // 3. Enforce at least 1 image per product
    if (combinedImages.length === 0) {
      throw new AppError('Product must have at least one image', 400, ERROR_CODES.ERR_VALIDATION_FAILED);
    }

    // 4. Handle imagesOrder if provided
    let imagesOrder = updateData.imagesOrder;
    if (typeof imagesOrder === 'string') {
      try {
        imagesOrder = JSON.parse(imagesOrder);
      } catch (e) {
        imagesOrder = null;
      }
    }
    if (Array.isArray(imagesOrder) && imagesOrder.length > 0) {
      combinedImages.forEach((img) => {
        const matchingIdx = imagesOrder.findIndex((item) =>
          typeof item === 'string' ? item === img.public_id : item.public_id === img.public_id
        );
        if (matchingIdx !== -1) {
          const item = imagesOrder[matchingIdx];
          img.order = typeof item === 'object' && item.order !== undefined ? item.order : matchingIdx;
        }
      });
    }

    // 5. Handle primaryImageId
    const primaryImageId = updateData.primaryImageId;
    if (primaryImageId) {
      combinedImages.forEach((img) => {
        img.isPrimary = img.public_id === primaryImageId;
      });
    }

    const finalImages = sortAndNormalizeImages(combinedImages);

    // Clean up custom fields from updateData before object assign
    delete updateData.removeImageIds;
    delete updateData.primaryImageId;
    delete updateData.imagesOrder;

    Object.assign(product, updateData);
    product.images = finalImages;

    await product.save();

    // 6. Delete purged images from Cloudinary ONLY after successful DB save
    for (const img of imagesToDelete) {
      await deleteCloudinaryImage(img.public_id);
    }

    return product;
  } catch (error) {
    // Purge newly uploaded files from Cloudinary if DB update failed
    for (const pubId of newlyUploadedPublicIds) {
      await deleteCloudinaryImage(pubId);
    }
    throw error;
  }
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
