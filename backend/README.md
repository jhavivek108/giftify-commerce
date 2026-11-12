# Little Gifts Story — API

Express + MongoDB (Mongoose) REST API for the Little Gifts Story shop.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:demo` | Runs the API on a temporary in-memory MongoDB seeded with the catalogue. No database or secrets needed; data vanishes on exit. |
| `npm run dev` | Runs the API against `MONGODB_URI` and restarts on file changes. |
| `npm start` | Production start. |
| `npm run seed` | Inserts the 6 categories and 44 products (safe to re-run; never overwrites admin edits). Creates the admin account when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. `npm run seed -- --reset` wipes categories and products first. |
| `npm run smoke` | End-to-end API test (65 checks) on an in-memory database. |

## Setup

1. `npm install`
2. Fill in `backend/.env` (every variable is explained in `.env.example`). `MONGODB_URI` and `JWT_SECRET` are required; the server prints a clear message and stops if they are missing.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then `npm run seed`.
4. `npm run dev`

Admins can only be created by the seed script. Public registration always creates a `customer`.

## Structure

```
src/
  config/       env validation (Zod) and the database connection
  models/       User, Product, Category, Cart, Wishlist, Order, Review, Newsletter, ContactMessage
  controllers/  request handlers
  services/     business logic (orders, cart, products, payments/, storage/)
  validators/   Zod schemas for body, params and query
  middleware/   auth, validation, rate limits, sanitising, errors
  routes/       route wiring
  seed/         catalogue.js (source of truth for products) and seed scripts
scripts/        demo.js and smoke.js
uploads/        images uploaded from the admin dashboard
```

## Responses

Success: `{ "success": true, "data": … }`. Error: `{ "success": false, "message": "…", "errors": [{ "path", "message" }] }`.
Money is stored as `Decimal128` and returned as plain numbers (rupees).

## Endpoints

| Area | Routes |
| --- | --- |
| Config | `GET /api/health`, `GET /api/config` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Categories | `GET /api/categories`; admin: `POST`, `PUT /:id`, `DELETE /:id` |
| Products | `GET /api/products`, `GET /api/products/:slug`; admin: `POST`, `PUT /:id`, `DELETE /:id`, `GET /api/admin/products` |
| Reviews | `GET` / `POST /api/products/:id/reviews`, `GET /api/reviews/recent`; admin: `DELETE /api/admin/reviews/:id` |
| Cart | `GET`, `POST`, `DELETE /api/cart`, `PUT` / `DELETE /api/cart/:itemId`, `POST /api/cart/merge` |
| Wishlist | `GET`, `POST /api/wishlist`, `DELETE /api/wishlist/:productId`, `POST /api/wishlist/merge` |
| Orders | `POST /api/orders`, `GET /api/orders/my-orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/cancel` |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status`, `PATCH /api/admin/orders/:id/payment`, `GET /api/admin/customers`, `GET /api/admin/customers/:id`, `GET /api/admin/messages`, `PATCH /api/admin/messages/:id/read`, `POST /api/uploads` |
| Misc | `POST /api/newsletter/subscribe`, `POST /api/contact` |

## Rules worth knowing

- Order prices are always recomputed on the server; client prices are ignored.
- Stock is decremented inside a MongoDB transaction (with a safe fallback on standalone MongoDB) and restored when an order is cancelled.
- Order items store a snapshot of the product name, price, size and colour, so past orders survive product edits and deletions.
- An order is never marked paid automatically. Only an admin can set `paymentStatus` to `paid`.
- Razorpay lives behind `src/services/payments/` and stays disabled until its keys are set and the provider is implemented.
