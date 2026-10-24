const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { updateOrderStatusSchema } = require('../validators/orderValidator');
const validateRequest = require('../middleware/validateMiddleware');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', protectAdmin, orderController.getOrders);
router.get('/sales', protectAdmin, orderController.getSalesSummary);
router.get('/:id', protectAdmin, orderController.getOrderById);
router.patch('/:id/status', protectAdmin, validateRequest(updateOrderStatusSchema), orderController.updateOrderStatus);

module.exports = router;
