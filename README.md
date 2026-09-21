# BizTrack Lite

A shop-management web app for small businesses. Track sales, expenses,
inventory, customer credit and daily cash flow.

**Stack:** vanilla HTML/CSS/JS frontend · Node.js (Express) backend ·
MySQL (XAMPP) database. No build step.

## Quick start

### 1. Database — XAMPP (MySQL)

1. Download XAMPP from <https://www.apachefriends.org/download.html>
   (any 8.x version) and install it at `C:\xampp` with defaults.
   *(Apache is not needed — only the MySQL module.)*
2. Open the **XAMPP Control Panel** and press **Start** next to **MySQL**.

### 2. Install & seed the backend

Requires Node.js 16+ (<https://nodejs.org>).

```bash
npm install     # express + mysql2
npm run seed    # creates the `biztrack` database + demo data
```

Connection defaults match XAMPP (user `root`, empty password, port 3306).
To override:

```bash
set DB_PASSWORD=secret
npm start
```

### 3. Run

```bash
npm start       # → http://localhost:3000
```

The footer shows **Connected to MySQL** when the API is live.

### Without the backend (fallback mode)

Double-clicking `index.html` still works: the store falls back to
localStorage demo mode and the footer shows **Offline demo mode**.

## API

| Endpoint            | Method | Purpose                                        |
| ------------------- | ------ | ---------------------------------------------- |
| `/api/bootstrap`    | GET    | Full app state in one call (items, customers, ledger, period totals) |
| `/api/sales`        | POST   | Record a sale — transaction: stock decrement, credit balance, ledger entry, sale counter |
| `/api/expenses`     | POST   | Record an expense + ledger entry               |
| `/api/expenses`     | GET    | Expense history (newest first, `?limit=&offset=`) |
| `/api/expenses/:id` | PUT    | Edit an expense — rewrites the books entry and moves the box difference |
| `/api/expenses/:id` | DELETE | Remove a mistaken expense — money returns to the box |
| `/api/products`     | POST   | Add a product (optionally buys initial stock)  |
| `/api/products/:id` | PUT    | Rename / reprice / change low-stock alert      |
| `/api/products/:id` | DELETE | Remove an unsold item (sold items are protected) |
| `/api/products/:id/restock` | POST | Add stock, booked as a Stock expense |
| `/api/customers`    | POST   | Add a customer (zero balance)                  |
| `/api/customers/:id`| PUT    | Rename a customer                              |
| `/api/customers/:id`| DELETE | Remove a settled customer (debtors are protected) |
| `/api/payments`     | POST   | Record a customer payment, update balance      |
| `/api/reset`        | POST   | Wipe & reseed demo data                        |

Writes run in **SQL transactions** — e.g. a credit sale updates the
product stock, customer balance, ledger and sale counter atomically.

## Database schema (`server/schema.sql`)

```
settings        opening float, next sale number
products        id, name, price, stock, sold_week, low_threshold
customers       id, name, balance, last_payment
sales           number, customer_id, method, total, created_at
sale_items      sale_id, product_id, qty, unit_price
expenses        id, category, amount, note, method, created_at
ledger_entries  label, type, amount, method, category, expense_id
                (expense_id links auto-created books entries to
                the expense so edits/deletes stay consistent)
payments        customer_id, amount, method, created_at
ledger_entries  label, type (info|in|out|credit), amount, method, category
```

Notifications are derived live from low stock + customer balances —
no table needed.

## Frontend structure

```
.
├── index.html              # App shell: sidebar, topbar, page container
├── css/                    # base / layout / components / pages
├── js/
│   ├── api.js              # fetch wrapper for the backend API
│   ├── data.js             # store: bootstraps from MySQL, optimistic actions + reconcile, offline fallback
│   ├── ui.js               # escaping, formatting, toast, chips
│   ├── router.js           # hash router: render, active links, badge
│   ├── app.js              # bootstrap: waits for store, wires the shell
│   └── pages/              # one module per screen (10 files)
└── server/
    ├── server.js           # Express: static frontend + /api routes
    ├── db.js               # mysql2 pool + tx helper + date formatting
    ├── config.js           # DB/port config (env-overridable, XAMPP defaults)
    ├── seed.js             # npm run seed
    └── schema.sql          # tables + demo seed data
```

## Features

- **Landing page** — home screen with live stats from the database
- **Dashboard** — KPIs, closing balance, quick actions, recent activity, low-stock panel
- **New sale** — live totals, server-validated stock, Cash/MoMo/Credit
- **New expense / Expenses** — categorized, feeds ledger & month totals
- **Inventory** — stock levels, weekly sales, restock flags, stock value
- **Customers / Add payment** — credit balances, payment recording
- **Cash ledger** — running daily balance, opening → closing
- **Notifications** — derived from low stock and outstanding credit
- **Fully responsive** — sidebar (desktop) → icon rail (tablet) → drawer (mobile)

Reset the data at any time: `BT.store.reset()` in the browser console
(calls `POST /api/reset` when connected).
