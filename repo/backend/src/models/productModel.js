const mongoose = require('mongoose');

/*
 * NOTE REGARDING DELETION & REFERENCES:
 * Deleting a product document purges its Cloudinary images and document itself.
 * This operation is safe because Order documents store a full item SNAPSHOT at order creation time
 * (including bouquetId, title, price, and customizations) and NEVER reference the live Product
 * via Mongoose .populate(). Do NOT refactor Order schema to use live Product references.
 */

const variantDeltaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['bouquet', 'flower_pot', 'keychain', 'other'],
      default: 'bouquet',
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required']
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    variantDeltas: [variantDeltaSchema],
    stemCount: {
      type: Number,
      required: [true, 'Stem count is required'],
      min: [1, 'Stem count must be at least 1']
    },
    dimensions: {
      heightCm: { type: Number, required: true },
      widthCm: { type: Number, required: true }
    },
    images: [imageSchema],
    customization: {
      ribbonColors: [{ type: String }],
      wrappingPaperShades: [{ type: String }],
      defaultLeadTimeDays: { type: Number, default: 3 }
    },
    availability: {
      type: String,
      enum: ['available', 'made_to_order', 'sold_out'],
      default: 'available'
    },
    stockCount: {
      type: Number,
      default: 0,
      min: [0, 'Stock count cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate slug prior to save
productSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
