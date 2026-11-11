# StockFlow - Inventory Management MVP

A full-stack inventory management application built with Node.js, Express, MongoDB, React, and Vite.

## Tech Stack

**Backend:**
- Node.js 22+ (CommonJS)
- Express 5
- Mongoose 9 (MongoDB ODM)
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- helmet (security headers)
- dotenv (environment config)

**Frontend:**
- React 18
- React Router 6
- Vite 5 (build tool)
- CSS Custom Properties (theming with dark mode support)

**Testing:**
- Node.js built-in test runner (`node:test`, `node:assert`)

## Features

### Authentication
- User signup with organization creation
- Email normalization (lowercase)
- Password hashing with bcrypt (cost factor 10)
- JWT tokens (1-day expiry, Bearer auth)
- Protected routes with middleware

### Products CRUD
- Create, read, update, delete products
- Tenant isolation (organizations only see their own data)
- SKU uniqueness per organization (case-insensitive, stored uppercase)
- Search by name or SKU (regex-safe)
- Input validation (quantity integers, non-negative prices, etc.)

### Low-Stock Logic
- Organization-level default threshold (default: 5)
- Product-level threshold override (nullable)
- Threshold 0 = only quantity 0 is low stock
- Shared utility functions (`getEffectiveThreshold`, `isLowStock`)
- `isLowStock` field included in all product responses

### Dashboard API
- Total product count
- Total quantity across all products
- Low-stock products list with effective thresholds
- Tenant isolation enforced

### Frontend UI
- Login / Signup pages
- Dashboard with stats cards and low-stock table
- Products list with search and inline actions
- Product create/edit modal forms
- Responsive design with dark mode support
- Sidebar navigation with user/org info

## Project Structure

```
stockflow/
├── package.json
├── .env                    # Environment variables (not committed)
├── .env.example           # Environment template
├── .gitignore
├── vite.config.js         # Vite config (root: src/client)
├── src/
│   ├── server.js          # App entry point
│   ├── app.js             # Express app setup
│   ├── config/
│   │   ├── env.js         # Env validation
│   │   └── db.js          # Mongoose connection
│   ├── middleware/
│   │   ├── auth.js        # JWT verification
│   │   └── errorHandler.js # Centralized error handling
│   ├── utils/
│   │   ├── AppError.js    # Custom error class
│   │   ├── escapeRegex.js # Regex escaping for search
│   │   └── lowStock.js    # Low-stock utility functions
│   ├── models/
│   │   ├── Organization.js
│   │   ├── User.js
│   │   └── Product.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── productService.js
│   │   └── dashboardService.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   └── dashboardRoutes.js
│   └── client/            # React frontend
│       ├── index.html
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── index.css
│       │   ├── context/
│       │   │   └── AuthContext.jsx
│       │   ├── services/
│       │   │   └── api.js
│       │   ├── components/
│       │   │   ├── Layout.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   └── pages/
│       │       ├── Login.jsx
│       │       ├── Signup.jsx
│       │       ├── Dashboard.jsx
│       │       ├── Products.jsx
│       │       └── ProductForm.jsx
└── tests/
    ├── helpers.js
    ├── health.test.js
    ├── models.test.js
    ├── auth.test.js
    ├── products.test.js
    ├── tenant-isolation.test.js
    ├── lowstock.test.js
    └── dashboard.test.js
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/stockflow
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/stockflow_test
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

## Scripts

```bash
# Development
npm run dev          # Start backend with nodemon (port 3000)
npm run client       # Start frontend with Vite (port 5173)
npm run dev:full     # Run both concurrently

# Production
npm run build        # Build frontend to public/
npm start            # Start production server

# Testing
npm test             # Run all 136 tests (sequential)
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create organization + user
- `POST /api/auth/login` - Get JWT token

### Products (requires Bearer token)
- `GET /api/products` - List products (query: `search`)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Dashboard (requires Bearer token)
- `GET /api/dashboard` - Get aggregated metrics

### Health
- `GET /api/health` - Health check

## Data Models

### Organization
- `name` (String, 2-80 chars, required)
- `defaultLowStockThreshold` (Integer ≥ 0, default: 5)

### User
- `email` (String, unique, lowercase, required)
- `passwordHash` (String, select: false)
- `organizationId` (ObjectId, ref: Organization, required)

### Product
- `organizationId` (ObjectId, ref: Organization, required)
- `name` (String, 1-120 chars, required)
- `sku` (String, 1-64 chars, uppercase, required)
- `description` (String, max 1000 chars, optional)
- `quantity` (Integer ≥ 0, default: 0)
- `costPrice` (Number ≥ 0, optional)
- `sellingPrice` (Number ≥ 0, optional)
- `lowStockThreshold` (Integer ≥ 0, nullable, optional)
- Compound unique index: `{ organizationId: 1, sku: 1 }`

## Test Safety

Tests use a separate database (`stockflow_test`) with 4 safety checks:
1. `NODE_ENV` must be `test`
2. URI must contain `test`
3. URI must not be production URI
4. Database name must be `stockflow_test`

Run tests: `npm test` (136 tests, all passing)

## License

ISC