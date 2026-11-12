# Little Gifts Story

Full-stack shop for the handmade brand **Little Gifts Story** — *A little something, made by hand.*

| Part | Stack | Folder |
| --- | --- | --- |
| Storefront + admin dashboard | React, Vite, Tailwind CSS, React Router, Axios, Framer Motion, Lucide | `frontend/` |
| REST API | Node.js, Express, Mongoose, JWT, bcrypt, Zod, Multer | `backend/` |
| Database | MongoDB (Atlas or self-hosted) | — |
| Design reference | The selected "Gift by feeling" design (design 4) | `design-mockups/4-gift-by-feeling.png` |

The catalogue (44 designs, 6 categories, prices and size variants) is seeded from
`backend/src/seed/catalogue.js`, which mirrors the Product Catalogue 2026.

## Try it right now (no database needed)

Demo mode runs the API on an in-memory MongoDB that is seeded with the catalogue.
Data disappears when you stop it.

```bash
cd backend
npm install
npm run dev:demo
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Run it with your real database

1. Fill in `backend/.env` (see `backend/.env.example`). At minimum:
   - `MONGODB_URI` — your MongoDB Atlas / MongoDB connection string
   - `JWT_SECRET` — a long random string (32+ characters)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — the admin account the seed script creates
2. Seed the catalogue and the admin account, then start the API:

```bash
cd backend
npm run seed
npm run dev
```

3. Start the storefront:

```bash
cd frontend
npm run dev
```

The backend refuses to start and prints a clear message if a required variable is missing.

## Admin

- Sign in at `/admin/login` with the admin account created by `npm run seed`.
- There is no public admin registration. Customers who register always get the `customer` role.
- From the dashboard you can manage products, sizes, stock, prices, categories, orders,
  payment confirmation, customers and contact messages.

## Environment files

| File | Purpose |
| --- | --- |
| `.env.example` | Overview of every variable |
| `backend/.env`, `backend/.env.example` | Server configuration and secrets (never exposed to the browser) |
| `frontend/.env`, `frontend/.env.example` | Public values only (`VITE_*`) |

`.env` files are git-ignored. Never commit real credentials.

## Payments

Cash on Delivery and manually confirmed online payment are supported. An order is only
marked **paid** when an admin confirms it in the dashboard. Razorpay is stubbed behind
`backend/src/services/payments/` and stays disabled until its keys are added and the
provider is implemented.

## WhatsApp

"Order on WhatsApp" buttons open the official click-to-chat link (`https://wa.me/<number>?text=…`)
with the customer name, products, quantity, colour, size, customisation and total filled in.
Nothing is sent automatically; the customer reviews the message and presses send.
The number comes from `VITE_WHATSAPP_NUMBER` / `WHATSAPP_NUMBER`.

## Product photos

Product photos in `frontend/public/images/products/` were cut from the catalogue PDF.
Replace any of them (same file name) or upload new ones from the admin dashboard.
