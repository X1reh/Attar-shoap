// ================================================
// routes/orders.js — Order Routes
// POST   /api/orders             — Place order
// GET    /api/orders/my          — My orders
// GET    /api/orders/:id         — Single order
// PUT    /api/orders/:id/cancel  — Cancel order
// GET    /api/orders             — Admin: All orders
// PUT    /api/orders/:id/status  — Admin: Update status
// ================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// ─── Place Order ──────────────────────────────────
router.post('/', protect, [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { items, shippingAddress, payment, notes, isGift, giftMessage, coupon } = req.body;

    // Verify products and calculate pricing
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product ${item.product} not found` });
      }

      const sizeObj = product.sizes.find(s => s.volume === item.size);
      if (!sizeObj) {
        return res.status(400).json({ success: false, message: `Size ${item.size} not available` });
      }

      if (sizeObj.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        size: item.size,
        price: sizeObj.price,
        quantity: item.quantity
      });

      subtotal += sizeObj.price * item.quantity;
    }

    // Calculate totals
    const shipping = subtotal >= 100 ? 0 : 9.99;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    let discount = 0;

    if (coupon?.code) {
      // Coupon logic — simple 10% for demo
      discount = Math.round(subtotal * 0.10 * 100) / 100;
    }

    const total = Math.round((subtotal + shipping + tax - discount) * 100) / 100;

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      pricing: { subtotal, shipping, tax, discount, total },
      coupon: coupon?.code ? { code: coupon.code, discount } : undefined,
      payment: { method: payment?.method || 'stripe' },
      notes,
      isGift,
      giftMessage,
      statusHistory: [{ status: 'pending', message: 'Order placed successfully' }]
    });

    // Reduce stock
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, 'sizes.volume': item.size },
        { $inc: { 'sizes.$.stock': -item.quantity } }
      );
    }

    const populated = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images');

    res.status(201).json({ success: true, order: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── Get My Orders ────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments({ user: req.user._id });

    res.json({ success: true, orders, total, currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get Single Order ─────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name images slug');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Only owner or admin can view
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Cancel Order ─────────────────────────────────
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order cannot be cancelled (status: ${order.status})` });
    }

    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', message: req.body.reason || 'Cancelled by customer' });
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'sizes.volume': item.size },
        { $inc: { 'sizes.$.stock': item.quantity } }
      );
    }

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ADMIN: Get All Orders ────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);
    res.json({ success: true, orders, total, currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ADMIN: Update Order Status ───────────────────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, message, tracking } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    order.statusHistory.push({ status, message: message || `Status updated to ${status}` });
    if (tracking) order.tracking = tracking;
    if (status === 'delivered') order.payment.paidAt = new Date();

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
