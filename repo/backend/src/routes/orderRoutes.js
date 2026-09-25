const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/orderValidator');
const validateRequest = require('../middleware/validateMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/', validateRequest(createOrderSchema), orderController.createOrder);
router.get('/', protectAdmin, orderController.getOrders);
router.get('/:id', protectAdmin, orderController.getOrderById);
router.patch('/:id/status', protectAdmin, validateRequest(updateOrderStatusSchema), orderController.updateOrderStatus);

module.exports = router;
