// ================================================
// routes/payments.js — Stripe Payment Routes
// POST /api/payments/create-intent
// POST /api/payments/webhook
// POST /api/payments/confirm/:orderId
// ================================================

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

// Initialize Stripe (only if key exists)
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ─── Create Payment Intent ────────────────────────
router.post('/create-intent', protect, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Payment service not configured. Add STRIPE_SECRET_KEY to .env' });
    }

    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.pricing.total * 100), // in cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user._id.toString()
      }
    });

    // Save client secret to order
    order.payment.stripePaymentId = paymentIntent.id;
    order.payment.stripeClientSecret = paymentIntent.client_secret;
    await order.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.pricing.total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Stripe Webhook ───────────────────────────────
// Raw body needed for webhook signature verification
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({ received: true });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ 'payment.stripePaymentId': paymentIntent.id });

        if (order) {
          order.payment.status = 'paid';
          order.payment.paidAt = new Date();
          order.status = 'confirmed';
          order.statusHistory.push({ status: 'confirmed', message: 'Payment received successfully' });
          await order.save();
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ 'payment.stripePaymentId': paymentIntent.id });
        if (order) {
          order.payment.status = 'failed';
          await order.save();
        }
        break;
      }
    }

    res.json({ received: true });
  }
);

// ─── Confirm COD Payment ──────────────────────────
router.post('/confirm-cod/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.payment.method !== 'cod') {
      return res.status(400).json({ success: false, message: 'Not a COD order' });
    }

    order.status = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', message: 'Cash on delivery order confirmed' });
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
