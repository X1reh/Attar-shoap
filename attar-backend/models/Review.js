// ================================================
// models/Review.js — Review Schema
// ================================================

const mongoose = require('mongoose');
const Product = require('./Product');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  images: [String],
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0 },
  votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

// One review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Update product average rating after review save/delete
reviewSchema.statics.updateProductRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Product.findByIdAndUpdate(productId, {
    'ratings.average': stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
    'ratings.count': stats.length > 0 ? stats[0].count : 0
  });
};

reviewSchema.post('save', function () {
  this.constructor.updateProductRating(this.product);
});

reviewSchema.post('deleteOne', { document: true }, function () {
  this.constructor.updateProductRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
