// ================================================
// models/Order.js — Order Schema
// ================================================

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    image: String,
    size: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  shippingAddress: {
    fullName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true }
  },
  pricing: {
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  coupon: {
    code: String,
    discount: Number
  },
  payment: {
    method: { type: String, enum: ['stripe', 'cod', 'bank_transfer'], default: 'stripe' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    stripePaymentId: String,
    stripeClientSecret: String,
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  tracking: {
    carrier: String,
    trackingNumber: String,
    url: String,
    estimatedDelivery: Date
  },
  notes: String,
  isGift: { type: Boolean, default: false },
  giftMessage: String
}, {
  timestamps: true
});

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ZA-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
