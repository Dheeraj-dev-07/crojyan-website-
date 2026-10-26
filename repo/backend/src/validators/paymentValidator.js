const { z } = require('zod');

const createPaymentOrderSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    email: z.string().email('Valid email is required'),
    deliveryAddress: z.object({
      addressLine: z.string().min(5, 'Address line is required'),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      postalCode: z.string().min(4, 'Postal code is required')
    })
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
        selectedCustomization: z.object({
          ribbonColor: z.string().min(1, 'Ribbon color is required').default('Dusty Rose'),
          wrappingPaperShade: z.string().min(1, 'Wrapping paper shade is required').default('Cream Matte'),
          giftCardText: z.string().optional().default('')
        }).default({})
      })
    )
    .min(1, 'Cart must contain at least one item')
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required')
});

module.exports = {
  createPaymentOrderSchema,
  verifyPaymentSchema
};
