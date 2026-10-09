const { z } = require('zod');
const { ORDER_STATUSES } = require('../constants/orderStatuses');

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(ORDER_STATUSES, {
    errorMap: () => ({ message: 'Invalid order status value' })
  })
});

module.exports = {
  updateOrderStatusSchema
};
