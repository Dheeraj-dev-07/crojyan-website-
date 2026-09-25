# 🌸 Crochet Bouquet E-Commerce Platform

A full-stack modern e-commerce web application tailored for handcrafted crochet bouquets and floral arrangements. Built with **React**, **Node.js**, **Express**, **MongoDB**, and **Cloudinary**.

---

## 🚀 Features

### 🛍️ Customer Storefront
- **Interactive Home & Showcase Page**: Hero banners, featured bouquet collections, and promotional highlights.
- **Product Catalog & Filtering**: Filter by category, price ranges, and stock availability with real-time sorting.
- **Detailed Product View**: Multi-image galleries, customizable greeting messages/ribbon notes, and stock status.
- **Slide-over Cart Drawer**: Client-side state management using React Context API with `localStorage` persistence.
- **Seamless Checkout**: Address management, delivery options, price calculation, and order confirmation tracking.

### 🔐 Admin Dashboard & Operations
- **Secure Admin Portal**: JWT-based authentication (`/admin/login`) with protected route guards.
- **Product Management (CRUD)**: Create, update, list, and delete bouquets with automatic inventory tracking.
- **Media Engine**: Dual image upload engine supporting **Cloudinary Cloud Storage** with auto-fallback to local storage (`/uploads`).
- **Order Tracking**: Comprehensive order list with status updates (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Context API.
- **Backend**: Node.js, Express.js, Mongoose ODM, MongoDB Atlas / Local MongoDB.
- **Authentication & Security**: JSON Web Tokens (JWT), bcryptjs, Helmet.js, CORS, Express Mongo Sanitize.
- **Media & File Storage**: Cloudinary SDK (`cloudinary` v2), `multer-storage-cloudinary`, Multer.
- **Logging & Utilities**: Winston logger, Morgan HTTP request logger, custom `AppError` handler.

---

## 📁 Project Structure

```text
client_akanshi/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Cloudinary & Logger configurations
│   │   ├── controllers/     # Request/response controllers
│   │   ├── middleware/      # Auth, Multer upload & Error handlers
│   │   ├── models/          # Mongoose schemas (Product, Order, User)
│   │   ├── routes/          # Express API endpoints
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Helper classes & token generators
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # HTTP server entry point
│   ├── uploads/             # Local upload storage fallback
│   ├── .env                 # Environment variables configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/      # Navbar, Footer, CartDrawer, AdminProtectedRoute
    │   ├── context/         # AuthContext, CartContext
    │   ├── pages/           # HomePage, ShopPage, CheckoutPage, AdminDashboardPage, etc.
    │   ├── services/        # API client services
    │   ├── App.jsx          # Main App & Router configuration
    │   └── main.jsx         # React application entry point
    ├── index.html
    └── package.json
```

---

## ⚙️ Environment Configuration

Create a `.env` file inside the `backend` directory (refer to `backend/.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/crochet_bouquet_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_crochet_bloom_key_2026_jwt_token_safe
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Cloudinary Storage Credentials (Optional - uses local disk storage if omitted)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MongoDB**: Local MongoDB instance or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)

---

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm start
```
The backend server will start on `http://localhost:5000`.

---

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend application will start on `http://localhost:5173`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health check | Public |
| `POST` | `/api/v1/auth/login` | Admin login & JWT generation | Public |
| `GET` | `/api/v1/products` | Fetch all products with filters | Public |
| `GET` | `/api/v1/products/:id` | Fetch single product details | Public |
| `POST` | `/api/v1/products` | Create product (with image upload) | Admin |
| `PUT` | `/api/v1/products/:id` | Update product details | Admin |
| `DELETE` | `/api/v1/products/:id` | Delete product & purge images | Admin |
| `POST` | `/api/v1/orders` | Create new customer order | Public |
| `GET` | `/api/v1/orders` | List all orders | Admin |
| `PATCH` | `/api/v1/orders/:id/status` | Update order status | Admin |

---

## 📜 License

This project is proprietary and built for **Crochet Bouquet (Crojyan)**.
