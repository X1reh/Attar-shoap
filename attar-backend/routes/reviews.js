// ================================================
// routes/reviews.js — Review Routes
// GET    /api/reviews/product/:productId
// POST   /api/reviews
// PUT    /api/reviews/:id
// DELETE /api/reviews/:id
// POST   /api/reviews/:id/helpful
// ================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// ─── Get Reviews for a Product ────────────────────
router.get('/product/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true
    })
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({ product: req.params.productId, isApproved: true });

    // Rating breakdown
    const ratingBreakdown = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(req.params.productId), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, reviews, total, currentPage: Number(page), ratingBreakdown });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Create Review ────────────────────────────────
router.post('/', protect, [
  body('product').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('title').trim().notEmpty().withMessage('Review title is required'),
  body('comment').trim().isLength({ min: 10 }).withMessage('Comment must be at least 10 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { product, rating, title, comment } = req.body;

    // Check if already reviewed
    const existing = await Review.findOne({ user: req.user._id, product });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    // Check if user purchased this product
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': product,
      status: 'delivered'
    });

    const review = await Review.create({
      user: req.user._id,
      product,
      rating,
      title,
      comment,
      isVerifiedPurchase: !!hasPurchased
    });

    await review.populate('user', 'name avatar');
    res.status(201).json({ success: true, review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── Update Review ────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this review' });
    }

    const { rating, title, comment } = req.body;
    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;
    await review.save();

    res.json({ success: true, review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ─── Delete Review ────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Mark Review as Helpful ───────────────────────
router.post('/:id/helpful', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const alreadyVoted = review.votedBy.includes(req.user._id);
    if (alreadyVoted) {
      review.helpfulVotes -= 1;
      review.votedBy.pull(req.user._id);
    } else {
      review.helpfulVotes += 1;
      review.votedBy.push(req.user._id);
    }

    await review.save();
    res.json({ success: true, helpfulVotes: review.helpfulVotes, voted: !alreadyVoted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
