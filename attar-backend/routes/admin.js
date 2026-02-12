// ================================================
// routes/admin.js — Admin Dashboard Routes
// GET /api/admin/dashboard  — Stats overview
// GET /api/admin/users      — All users
// PUT /api/admin/users/:id  — Update user
// ================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require login + admin role
router.use(protect, adminOnly);

// ─── Dashboard Stats ──────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [totalOrders, totalRevenue, totalUsers, totalProducts, pendingOrders, recentOrders, topProducts] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ status: 'pending' }),
      Order.find().sort('-createdAt').limit(5).populate('user', 'name email'),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', totalSold: 1, revenue: 1 } }
      ])
    ]);

    // Monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'paid', createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalUsers,
        totalProducts,
        pendingOrders
      },
      recentOrders,
      topProducts,
      monthlyRevenue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get All Users ────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-password');

    const total = await User.countDocuments(query);
    res.json({ success: true, users, total, currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Update User (admin) ──────────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isActive },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Inventory Overview ───────────────────────────
router.get('/inventory', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).select('name sizes category badge');

    const lowStock = [];
    const outOfStock = [];

    products.forEach(p => {
      p.sizes.forEach(s => {
        if (s.stock === 0) outOfStock.push({ product: p.name, size: s.volume, category: p.category });
        else if (s.stock < 5) lowStock.push({ product: p.name, size: s.volume, stock: s.stock, category: p.category });
      });
    });

    res.json({ success: true, lowStock, outOfStock, totalProducts: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Sales Analytics ──────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [ordersByStatus, salesByCategory, dailySales] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $group: { _id: '$product.category', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, units: { $sum: '$items.quantity' } } },
        { $sort: { revenue: -1 } }
      ]),
      Order.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: startDate } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({ success: true, ordersByStatus, salesByCategory, dailySales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
