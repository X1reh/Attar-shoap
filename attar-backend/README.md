# 🫙 ZAFAR ATTAR — Backend API

A production-ready Node.js + Express + MongoDB backend for the Zafar Attar e-commerce website.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd zafar-attar-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Stripe keys
```

### 3. Seed the Database
```bash
npm run seed
```
This creates:
- **Admin:** `admin@zafarattar.com` / `Admin@12345`
- **Customer:** `customer@example.com` / `Customer@123`
- 6 sample attar products

### 4. Start the Server
```bash
npm run dev     # Development (with nodemon auto-reload)
npm start       # Production
```

Server runs at: **http://localhost:5000**

---

## 📁 Project Structure

```
zafar-attar-backend/
├── server.js              ← Main entry point
├── package.json
├── .env.example           ← Copy to .env
│
├── models/
│   ├── User.js            ← User schema (auth, addresses, wishlist)
│   ├── Product.js         ← Product schema (sizes, notes, ratings)
│   ├── Order.js           ← Order schema (items, payment, tracking)
│   └── Review.js          ← Review schema (ratings, verified purchase)
│
├── routes/
│   ├── auth.js            ← Register, login, password reset
│   ├── products.js        ← CRUD + search + filters
│   ├── orders.js          ← Place, track, cancel orders
│   ├── cart.js            ← Cart validation + coupons
│   ├── users.js           ← Wishlist + addresses
│   ├── reviews.js         ← Create, update, helpful votes
│   ├── payments.js        ← Stripe integration
│   └── admin.js           ← Dashboard, analytics, inventory
│
├── middleware/
│   └── auth.js            ← JWT protect, admin-only, optional auth
│
└── config/
    └── seed.js            ← Database seeder
```

---

## 🔐 Authentication

All protected routes require a Bearer token in the header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Reference

### Auth Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| GET | `/api/auth/me` | Private | Get current user |
| PUT | `/api/auth/update-profile` | Private | Update profile |
| PUT | `/api/auth/change-password` | Private | Change password |
| POST | `/api/auth/forgot-password` | Public | Send reset email |
| PUT | `/api/auth/reset-password/:token` | Public | Reset password |

### Product Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/products` | Public | Get all products (filters, search, pagination) |
| GET | `/api/products/featured` | Public | Get featured products |
| GET | `/api/products/:id` | Public | Get single product |
| GET | `/api/products/slug/:slug` | Public | Get by slug |
| GET | `/api/products/:id/related` | Public | Get related products |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft delete product |

### Order Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Private | Place new order |
| GET | `/api/orders/my` | Private | Get my orders |
| GET | `/api/orders/:id` | Private | Get order details |
| PUT | `/api/orders/:id/cancel` | Private | Cancel order |
| GET | `/api/orders` | Admin | Get all orders |
| PUT | `/api/orders/:id/status` | Admin | Update order status |

### Cart Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/cart/validate` | Private | Validate cart + pricing |
| POST | `/api/cart/coupon` | Private | Apply coupon code |

### Review Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reviews/product/:productId` | Public | Get product reviews |
| POST | `/api/reviews` | Private | Create review |
| PUT | `/api/reviews/:id` | Private | Update review |
| DELETE | `/api/reviews/:id` | Private/Admin | Delete review |
| POST | `/api/reviews/:id/helpful` | Private | Mark helpful |

### User Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users/wishlist` | Private | Get wishlist |
| POST | `/api/users/wishlist/:productId` | Private | Add to wishlist |
| DELETE | `/api/users/wishlist/:productId` | Private | Remove from wishlist |
| GET | `/api/users/addresses` | Private | Get addresses |
| POST | `/api/users/addresses` | Private | Add address |
| PUT | `/api/users/addresses/:id` | Private | Update address |
| DELETE | `/api/users/addresses/:id` | Private | Delete address |

### Payment Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/payments/create-intent` | Private | Create Stripe PaymentIntent |
| POST | `/api/payments/webhook` | Stripe | Handle Stripe webhooks |
| POST | `/api/payments/confirm-cod/:orderId` | Private | Confirm COD order |

### Admin Routes
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/dashboard` | Admin | Stats overview |
| GET | `/api/admin/users` | Admin | All users |
| PUT | `/api/admin/users/:id` | Admin | Update user role |
| GET | `/api/admin/inventory` | Admin | Stock levels |
| GET | `/api/admin/analytics` | Admin | Sales analytics |

---

## 🔍 Product Query Parameters

```
GET /api/products?category=Oud & Agarwood&sort=-createdAt&page=1&limit=12
```

| Param | Type | Description |
|-------|------|-------------|
| `category` | String | Filter by category |
| `badge` | String | Filter by badge (Bestseller, New, Rare) |
| `search` | String | Full-text search |
| `minPrice` | Number | Minimum price |
| `maxPrice` | Number | Maximum price |
| `sort` | String | Sort field (e.g. `-createdAt`, `price`) |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Items per page (default: 12) |
| `featured` | Boolean | Featured products only |
| `gender` | String | Masculine/Feminine/Unisex |
| `season` | String | Spring/Summer/Autumn/Winter |

---

## 🧪 Test with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test1234"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zafarattar.com","password":"Admin@12345"}'
```

### Get Products
```bash
curl http://localhost:5000/api/products
```

---

## 💳 Coupon Codes (Demo)

| Code | Discount |
|------|----------|
| `WELCOME10` | 10% off |
| `ATTAR20` | 20% off |
| `FREESHIP` | Free shipping |
| `ROYAL50` | $50 off |

---

## ⚙️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcryptjs
- **Payments:** Stripe
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting
- **Email:** Nodemailer

---

## 🔧 Connect to Your Frontend

In your `attar-shop.html`, update your fetch calls to point to this API:

```javascript
const API_URL = 'http://localhost:5000/api';

// Example: load products
const res = await fetch(`${API_URL}/products?featured=true`);
const data = await res.json();
```
