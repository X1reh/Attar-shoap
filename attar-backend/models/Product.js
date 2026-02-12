// ================================================
// models/Product.js — Product Schema
// ================================================

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Oud & Agarwood', 'Rose & Florals', 'Musk & Amber', 'Spice & Oriental', 'Gift Sets'],
  },
  origin: {
    type: String,
    required: [true, 'Origin is required']
  },
  notes: {
    top: [String],
    middle: [String],
    base: [String]
  },
  sizes: [{
    volume: { type: String, required: true },  // e.g. "3ml", "6ml", "12ml"
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: String
  }],
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  badge: {
    type: String,
    enum: ['Bestseller', 'New', 'Rare', 'Limited', 'Sale', null],
    default: null
  },
  discount: {
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    validUntil: Date
  },
  tags: [String],
  ingredients: [String],
  distillationMethod: String,
  agingPeriod: String,
  concentration: String,
  longevity: {
    type: String,
    enum: ['4-6 hours', '6-8 hours', '8-12 hours', '12+ hours']
  },
  sillage: {
    type: String,
    enum: ['Intimate', 'Moderate', 'Strong', 'Very Strong']
  },
  gender: {
    type: String,
    enum: ['Masculine', 'Feminine', 'Unisex'],
    default: 'Unisex'
  },
  season: [{ type: String, enum: ['Spring', 'Summer', 'Autumn', 'Winter', 'All Year'] }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  metaTitle: String,
  metaDescription: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});

// Auto-generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Index for search performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', productSchema);
