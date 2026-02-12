// ================================================
// config/seed.js — Seed Database with Sample Data
// Run: node config/seed.js
// ================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zafar_attar';

const sampleProducts = [
  {
    name: 'Royal Hind Oud',
    description: 'Our crown jewel — sourced from the oldest agarwood forests of Assam, this oud captures the deep, resinous soul of ancient wood. Distilled using traditional copper degs over 48 hours into pure Mysore sandalwood base oil.',
    shortDescription: 'Deep forest oud from Assam, India. Complex, ancient, and powerful.',
    category: 'Oud & Agarwood',
    origin: 'Assam, India',
    notes: {
      top: ['Smoky Wood', 'Earthy Resin'],
      middle: ['Aged Agarwood', 'Vetiver'],
      base: ['Mysore Sandalwood', 'Warm Vanilla', 'Amber']
    },
    sizes: [
      { volume: '3ml', price: 75, stock: 30, sku: 'RHO-3' },
      { volume: '6ml', price: 148, stock: 20, sku: 'RHO-6' },
      { volume: '12ml', price: 285, stock: 10, sku: 'RHO-12' }
    ],
    badge: 'Bestseller',
    tags: ['oud', 'agarwood', 'smoky', 'woody', 'intense'],
    longevity: '12+ hours',
    sillage: 'Strong',
    gender: 'Unisex',
    season: ['Autumn', 'Winter'],
    distillationMethod: 'Traditional Hydro-Distillation (Deg-Bhapka)',
    agingPeriod: 'Base oil aged 5 years',
    isFeatured: true
  },
  {
    name: 'Damask Rose Taif',
    description: 'The queen of all florals. Our Damask Rose attar is sourced from the rare Rosa damascena cultivated in the mountains of Taif, Saudi Arabia. Each bottle requires over 3,000 hand-picked roses.',
    shortDescription: 'Rare Taif rose — fresh, honeyed, intensely floral.',
    category: 'Rose & Florals',
    origin: 'Taif, Saudi Arabia',
    notes: {
      top: ['Fresh Rose Petals', 'Green Stem'],
      middle: ['Rosa Damascena', 'Honey'],
      base: ['White Musk', 'Mild Oud']
    },
    sizes: [
      { volume: '3ml', price: 38, stock: 50, sku: 'DRT-3' },
      { volume: '6ml', price: 75, stock: 35, sku: 'DRT-6' },
      { volume: '12ml', price: 145, stock: 15, sku: 'DRT-12' }
    ],
    badge: 'New',
    tags: ['rose', 'floral', 'feminine', 'honeyed', 'fresh'],
    longevity: '8-12 hours',
    sillage: 'Moderate',
    gender: 'Feminine',
    season: ['Spring', 'Summer'],
    distillationMethod: 'Traditional Hydro-Distillation',
    isFeatured: true
  },
  {
    name: 'Mysore Shamama',
    description: 'A legendary attar composed of 40+ botanicals including saffron, sandalwood, rose, and rare forest herbs. Aged for 12 years in traditional earthen pots in Kannauj. A true collectors fragrance.',
    shortDescription: 'A 12-year aged masterpiece of 40+ botanicals.',
    category: 'Spice & Oriental',
    origin: 'Kannauj, India (Mysore Sandalwood Base)',
    notes: {
      top: ['Saffron', 'Cardamom', 'Cinnamon'],
      middle: ['Aged Sandalwood', 'Forest Herbs', 'Earthy Moss'],
      base: ['Complex Oriental Base', 'Amber', 'Oud']
    },
    sizes: [
      { volume: '3ml', price: 110, stock: 15, sku: 'MSH-3' },
      { volume: '6ml', price: 220, stock: 8, sku: 'MSH-6' },
      { volume: '12ml', price: 420, stock: 4, sku: 'MSH-12' }
    ],
    badge: 'Rare',
    tags: ['shamama', 'complex', 'aged', 'oriental', 'collector'],
    longevity: '12+ hours',
    sillage: 'Very Strong',
    gender: 'Unisex',
    season: ['Autumn', 'Winter'],
    distillationMethod: 'Traditional Hydro-Distillation',
    agingPeriod: '12 years in earthen pots',
    isFeatured: true
  },
  {
    name: 'Saffron Musk Gold',
    description: 'Golden saffron threads from the valleys of Kashmir meet the finest white musk in this radiant attar. Warm, spiced, and sensual — a true eastern luxury.',
    shortDescription: 'Kashmiri saffron meets warm white musk.',
    category: 'Musk & Amber',
    origin: 'Kashmir, India',
    notes: {
      top: ['Golden Saffron', 'Black Pepper'],
      middle: ['Warm Musk', 'Rose Absolute'],
      base: ['Amber', 'Cedarwood', 'Sandalwood']
    },
    sizes: [
      { volume: '3ml', price: 55, stock: 40, sku: 'SMG-3' },
      { volume: '6ml', price: 110, stock: 25, sku: 'SMG-6' },
      { volume: '12ml', price: 210, stock: 12, sku: 'SMG-12' }
    ],
    badge: null,
    tags: ['saffron', 'musk', 'amber', 'warm', 'spicy'],
    longevity: '8-12 hours',
    sillage: 'Strong',
    gender: 'Unisex',
    season: ['Autumn', 'Winter', 'All Year'],
    isFeatured: true
  },
  {
    name: 'Blue Lotus Ceylon',
    description: 'The sacred Blue Lotus (Nymphaea caerulea) from the ancient lagoons of Sri Lanka. Delicate, aquatic, and transcendent — this rare floral attar is a meditative experience.',
    shortDescription: 'Rare aquatic lotus from Sri Lanka — serene and ethereal.',
    category: 'Rose & Florals',
    origin: 'Sri Lanka',
    notes: {
      top: ['Aquatic Lotus', 'Green Tea'],
      middle: ['White Jasmine', 'Neroli'],
      base: ['Clean Musk', 'Soft Amber']
    },
    sizes: [
      { volume: '3ml', price: 30, stock: 60, sku: 'BLC-3' },
      { volume: '6ml', price: 60, stock: 40, sku: 'BLC-6' },
      { volume: '12ml', price: 115, stock: 20, sku: 'BLC-12' }
    ],
    badge: null,
    tags: ['lotus', 'aquatic', 'floral', 'fresh', 'delicate'],
    longevity: '6-8 hours',
    sillage: 'Moderate',
    gender: 'Unisex',
    season: ['Spring', 'Summer'],
    isFeatured: false
  },
  {
    name: 'Black Oud Cambodian',
    description: 'Sourced from the rarest Aquilaria malaccensis trees of Cambodia, this dark oud carries the weight of centuries. Deep, animalic, barnyard-forward with a leather and smoke finish. For the serious oud connoisseur.',
    shortDescription: 'Ultra-rare Cambodian oud for the serious collector.',
    category: 'Oud & Agarwood',
    origin: 'Cambodia (Aquilaria malaccensis)',
    notes: {
      top: ['Barnyard', 'Smoke'],
      middle: ['Dark Oud', 'Leather', 'Incense'],
      base: ['Deep Resin', 'Patchouli', 'Dry Wood']
    },
    sizes: [
      { volume: '3ml', price: 185, stock: 8, sku: 'BOC-3' },
      { volume: '6ml', price: 360, stock: 4, sku: 'BOC-6' }
    ],
    badge: 'Rare',
    tags: ['oud', 'dark', 'animalic', 'cambodian', 'collector', 'premium'],
    longevity: '12+ hours',
    sillage: 'Very Strong',
    gender: 'Masculine',
    season: ['Autumn', 'Winter'],
    distillationMethod: 'Steam Distillation',
    agingPeriod: 'Minimum 15-year old trees',
    isFeatured: false
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Zafar Admin',
      email: 'admin@zafarattar.com',
      password: 'Admin@12345',
      role: 'admin',
      isEmailVerified: true
    });
    console.log(`👤 Admin created: admin@zafarattar.com / Admin@12345`);

    // Create sample user
    await User.create({
      name: 'Ahmed Hassan',
      email: 'customer@example.com',
      password: 'Customer@123',
      role: 'user',
      isEmailVerified: true,
      phone: '+971501234567'
    });
    console.log(`👤 Sample customer: customer@example.com / Customer@123`);

    // Create products
    const products = await Product.insertMany(sampleProducts);
    console.log(`📦 Created ${products.length} products`);

    console.log('\n✦ Seed complete! Here are your login credentials:\n');
    console.log('  Admin:    admin@zafarattar.com  /  Admin@12345');
    console.log('  Customer: customer@example.com  /  Customer@123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedDB();
