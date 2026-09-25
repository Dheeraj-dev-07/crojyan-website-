const { z } = require('zod');
const { ORDER_STATUSES } = require('../constants/orderStatuses');

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

const createOrderSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
    email: z.string().email('Invalid email address'),
    deliveryAddress: z.object({
      addressLine: z.string().min(5, 'Address line required'),
      city: z.string().min(2, 'City required'),
      state: z.string().min(2, 'State required'),
      postalCode: z.string().min(3, 'Postal code required')
    })
  }),
  items: z.array(
    z.object({
      bouquetId: z.string().min(12, 'Valid Bouquet ID required'),
      selectedCustomization: z.object({
        ribbonColor: z.string().min(1, 'Ribbon color selection required'),
        wrappingPaperShade: z.string().min(1, 'Wrapping paper shade required'),
        giftCardText: z.string().max(300, 'Gift note cannot exceed 300 characters').optional().default('')
      }),
      quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
      unitPrice: z.coerce.number().positive('Unit price must be positive')
    })
  ).min(1, 'Order must contain at least one item')
});

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(ORDER_STATUSES, {
    errorMap: () => ({ message: 'Invalid order status value' })
  })
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema
};
