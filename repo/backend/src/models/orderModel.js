const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../constants/orderStatuses');

/*
 * NOTE REGARDING SNAPSHOTS:
 * Order items store complete immutable snapshots (bouquetId, bouquetTitle, selectedCustomization, quantity, unitPrice)
 * captured at the exact moment of order placement. They are NOT populated dynamically from Product model,
 * guaranteeing historic pricing and details integrity even if the source product is updated or deleted.
 */

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    bouquetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    bouquetTitle: {
      type: String,
      required: true
    },
    selectedCustomization: {
      ribbonColor: { type: String, required: true },
      wrappingPaperShade: { type: String, required: true },
      giftCardText: { type: String, default: '' }
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    deliveryAddress: {
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: customerSchema,
      required: true
    },
    items: [orderItemSnapshotSchema],
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.PENDING_REVIEW
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
