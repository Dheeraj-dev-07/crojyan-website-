const { z } = require('zod');

const createProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['bouquet', 'flower_pot', 'key_chain', 'other']).default('bouquet'),
  basePrice: z.coerce.number().positive('Base price must be positive'),
  variantDeltas: z.array(
    z.object({
      name: z.string().min(1, 'Variant name required'),
      priceDelta: z.coerce.number()
    })
  ).optional().default([]),
  stemCount: z.coerce.number().int().positive('Stem count must be a positive integer'),
  dimensions: z.object({
    heightCm: z.coerce.number().positive('Height in cm must be positive'),
    widthCm: z.coerce.number().positive('Width in cm must be positive')
  }),
  customization: z.object({
    ribbonColors: z.array(z.string()).min(1, 'At least one ribbon color required'),
    wrappingPaperShades: z.array(z.string()).min(1, 'At least one paper shade required'),
    defaultLeadTimeDays: z.coerce.number().int().min(1, 'Lead time must be at least 1 day').default(3)
  }),
  availability: z.enum(['available', 'made_to_order', 'sold_out']).default('available'),
  stockCount: z.coerce.number().int().min(0, 'Stock count cannot be negative').optional().default(0),
  removeImageIds: z.any().optional(),
  primaryImageId: z.string().optional(),
  imagesOrder: z.any().optional()
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  createProductSchema,
  updateProductSchema
};
