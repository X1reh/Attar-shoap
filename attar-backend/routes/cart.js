// ================================================
// routes/cart.js — Cart Routes (Session/DB based)
// ================================================

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Cart stored in-memory for demo; in production use Redis or DB Cart model

// ─── Get Cart Summary (validate items + get prices) ─
router.post('/validate', protect, async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, size, quantity }]
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).select('name images sizes isActive');

      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      const sizeObj = product.sizes.find(s => s.volume === item.size);
      if (!sizeObj) {
        return res.status(400).json({ success: false, message: `Size unavailable: ${item.size}` });
      }

      validatedItems.push({
        productId: product._id,
        name: product.name,
        image: product.images[0]?.url || null,
        size: item.size,
        price: sizeObj.price,
        stock: sizeObj.stock,
        quantity: Math.min(item.quantity, sizeObj.stock),
        subtotal: sizeObj.price * item.quantity
      });

      subtotal += sizeObj.price * item.quantity;
    }

    const shipping = subtotal >= 100 ? 0 : 9.99;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;

    res.json({
      success: true,
      items: validatedItems,
      pricing: {
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping + tax
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Check coupon ─────────────────────────────────
router.post('/coupon', protect, async (req, res) => {
  const coupons = {
    'WELCOME10': { discount: 10, type: 'percentage', description: '10% off your first order' },
    'ATTAR20':   { discount: 20, type: 'percentage', description: '20% discount' },
    'FREESHIP':  { discount: 0, type: 'freeShipping', description: 'Free shipping' },
    'ROYAL50':   { discount: 50, type: 'fixed', description: '$50 off orders over $200' }
  };

  const { code } = req.body;
  const coupon = coupons[code?.toUpperCase()];

  if (!coupon) {
    return res.status(400).json({ success: false, message: 'Invalid coupon code' });
  }

  res.json({ success: true, coupon: { code: code.toUpperCase(), ...coupon } });
});

module.exports = router;
