// ================================================
// routes/products.js — Product Routes
// GET    /api/products           — Get all (with filters)
// GET    /api/products/:id       — Get single
// GET    /api/products/slug/:slug
// POST   /api/products           — Admin: Create
// PUT    /api/products/:id       — Admin: Update
// DELETE /api/products/:id       — Admin: Delete
// ================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET All Products (with filters, search, pagination) ─
router.get('/', async (req, res) => {
  try {
    const {
      category, badge, search, minPrice, maxPrice,
      sort = '-createdAt', page = 1, limit = 12,
      featured, gender, season
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (badge) query.badge = badge;
    if (featured === 'true') query.isFeatured = true;
    if (gender) query.gender = gender;
    if (season) query.season = { $in: [season] };

    // Price filter on sizes
    if (minPrice || maxPrice) {
      query['sizes.price'] = {};
      if (minPrice) query['sizes.price'].$gte = Number(minPrice);
      if (maxPrice) query['sizes.price'].$lte = Number(maxPrice);
    }

    // Full-text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET Featured Products ─────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true }).limit(6);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET Product by Slug ───────────────────────────
router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate({ path: 'reviews', populate: { path: 'user', select: 'name avatar' } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET Single Product ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: 'reviews', populate: { path: 'user', select: 'name avatar' } });

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET Related Products ──────────────────────────
router.get('/:id/related', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    res.json({ success: true, products: related });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── CREATE Product (Admin) ────────────────────────
router.post('/', protect, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('origin').notEmpty().withMessage('Origin is required'),
  body('sizes').isArray({ min: 1 }).withMessage('At least one size is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── UPDATE Product (Admin) ────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── DELETE Product (Admin) ────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product removed from store' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
