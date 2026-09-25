const productService = require('../services/productService');
const { sendSuccess } = require('../utils/responseHandler');

const getProducts = async (req, res, next) => {
  try {
    const { products, meta } = await productService.getAllProducts(req.query);
    return sendSuccess(res, 200, products, meta, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    return sendSuccess(res, 200, product, null, 'Product details retrieved');
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    const files = req.files || [];
    const newProduct = await productService.createProduct(productData, files);
    return sendSuccess(res, 201, newProduct, null, 'Bouquet product created successfully');
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files || [];
    const updatedProduct = await productService.updateProduct(id, updateData, files);
    return sendSuccess(res, 200, updatedProduct, null, 'Bouquet product updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await productService.deleteProduct(id);
    return sendSuccess(res, 200, result, null, 'Bouquet product removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
