// ================================================
// routes/users.js — User Profile Routes
// GET    /api/users/wishlist
// POST   /api/users/wishlist/:productId
// DELETE /api/users/wishlist/:productId
// GET    /api/users/addresses
// POST   /api/users/addresses
// PUT    /api/users/addresses/:id
// DELETE /api/users/addresses/:id
// ================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ─── Get Wishlist ─────────────────────────────────
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist', 'name images sizes badge ratings');
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Add to Wishlist ──────────────────────────────
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    user.wishlist.push(req.params.productId);
    await user.save();

    res.json({ success: true, message: 'Added to wishlist', wishlistCount: user.wishlist.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Remove from Wishlist ─────────────────────────
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();

    res.json({ success: true, message: 'Removed from wishlist', wishlistCount: user.wishlist.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get Addresses ────────────────────────────────
router.get('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Add Address ──────────────────────────────────
router.post('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── Update Address ───────────────────────────────
router.put('/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.addressId);

    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });

    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }

    Object.assign(addr, req.body);
    await user.save();

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── Delete Address ───────────────────────────────
router.delete('/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
    await user.save();

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
