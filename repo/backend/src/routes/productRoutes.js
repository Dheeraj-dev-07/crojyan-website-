const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { createProductSchema, updateProductSchema } = require('../validators/productValidator');
const validateRequest = require('../middleware/validateMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

router.post(
  '/',
  protectAdmin,
  upload.array('images', 5),
  validateRequest(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  protectAdmin,
  upload.array('images', 5),
  validateRequest(updateProductSchema),
  productController.updateProduct
);

router.delete('/:id', protectAdmin, productController.deleteProduct);

module.exports = router;
