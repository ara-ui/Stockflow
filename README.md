# StockFlow — Inventory Management System

StockFlow is a full-stack inventory management MVP built with React, Node.js, Express and MongoDB. It helps organizations manage products, monitor stock levels and identify low-stock items.

## Live Demo

Coming soon.

## GitHub Repository

https://github.com/ara-ui/Stockflow

## Technology Stack

**Frontend**
- React 18
- React Router 6
- Vite 5
- CSS

**Backend**
- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT authentication
- bcrypt
- Helmet

**Testing**
- Node.js built-in test runner

## Features

### Authentication
- User registration and login
- Organization creation during signup
- Password hashing
- JWT-based authentication
- Protected routes

### Product Management
- Create, view, update and delete products
- Product name, SKU and description
- Quantity on hand
- Cost and selling prices
- Product-specific low-stock thresholds
- Search by product name or SKU
- SKU uniqueness within each organization

### Dashboard
- Total product count
- Total quantity on hand
- Low-stock product list
- Organization-specific inventory data

### Low-Stock Management
- Organization-level default threshold
- Product-level threshold override
- Low stock when quantity is less than or equal to the effective threshold

### Organization Isolation
Each organization can access only its own users' inventory data.

## Project Structure

```text
Stockflow/
├── public/                 # Production React build
├── src/
│   ├── client/             # React frontend
│   │   └── src/
│   │       ├── components/
│   │       ├── context/
│   │       ├── pages/
│   │       └── services/
│   ├── config/             # Environment and DB configuration
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── vite.config.js
```

## Prerequisites

- Node.js 22 or later
- npm
- MongoDB local instance or MongoDB Atlas

## Local Setup

Clone the repository:

```bash
git clone https://github.com/ara-ui/Stockflow.git
cd Stockflow
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root using `.env.example` as a template.

Configure:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/stockflow
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/stockflow_test
JWT_SECRET=replace_with_a_secure_random_secret
NODE_ENV=development
```

Start the backend:

```bash
npm run dev
```

Start the frontend in another terminal:

```bash
npm run client
```

Open:

http://localhost:5173

## Production Build

Build the React frontend:

```bash
npm run build
```

The production frontend is generated in `public/`.

Start the Express server:

```bash
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a user and organization |
| POST | `/api/auth/login` | Authenticate a user |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

Product endpoints require a valid Bearer token.

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Get inventory summary |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Application health check |

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port; provided by hosting platform in production |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_URI_TEST` | Separate test database connection |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `NODE_ENV` | Application environment |

Never commit `.env` or production credentials to GitHub.

## Testing

Run the backend test suite:

```bash
npm test
```

The tests cover authentication, product CRUD, dashboard metrics, low-stock logic, model validation and organization-level data isolation.

## Deployment

StockFlow can be deployed as a single Render Web Service serving the React production build and Express API.

Recommended Render configuration:

- Runtime: Node
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check: `/api/health`

Configure `MONGODB_URI`, `JWT_SECRET` and `NODE_ENV=production` in Render's Environment settings.

## License

ISC