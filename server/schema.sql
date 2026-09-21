-- ============================================================
-- BizTrack Lite — MySQL schema & demo seed data
--
-- Works with XAMPP's MySQL/MariaDB. Run with either:
--   • phpMyAdmin  → Import → this file
--   • npm run seed  (uses the Node connection in server/config.js)
--   • C:\xampp\mysql\bin\mysql.exe -u root < server\schema.sql
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS + ALTER ... IF NOT
-- EXISTS (MariaDB 10.4+) + INSERT IGNORE for the demo account.
-- ============================================================

CREATE DATABASE IF NOT EXISTS biztrack
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biztrack;

-- ---------- Users & sessions (authentication) ----------

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role          ENUM('owner','staff') NOT NULL DEFAULT 'owner',
  phone         VARCHAR(30)  NULL,
  shop_name     VARCHAR(80)  NULL,
  currency      VARCHAR(8)   NOT NULL DEFAULT 'RWF',
  language      VARCHAR(5)   NOT NULL DEFAULT 'en',
  theme         ENUM('light','dark') NOT NULL DEFAULT 'light',
  accent        VARCHAR(10)  NOT NULL DEFAULT 'navy',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token      CHAR(64) PRIMARY KEY,
  user_id    INT       NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME  NOT NULL,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

/* Single-use tokens behind "Forgot password?" (30-minute life) */
CREATE TABLE IF NOT EXISTS password_resets (
  token      CHAR(48) PRIMARY KEY,
  user_id    INT       NOT NULL,
  used       TINYINT   NOT NULL DEFAULT 0,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME  NOT NULL,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Core tables ----------

CREATE TABLE IF NOT EXISTS settings (
  id            TINYINT UNSIGNED PRIMARY KEY,
  opening_float INT  NOT NULL DEFAULT 53400,
  sale_counter  INT  NOT NULL DEFAULT 145,
  /* money boxes — where the money physically sits.
     (the credit box = SUM(customers.balance), computed live) */
  cash_box      INT  NOT NULL DEFAULT 53400,
  bank_box      INT  NOT NULL DEFAULT 120000,
  momo_box      INT  NOT NULL DEFAULT 26000
);

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS cash_box INT NOT NULL DEFAULT 53400,
  ADD COLUMN IF NOT EXISTS bank_box INT NOT NULL DEFAULT 120000,
  ADD COLUMN IF NOT EXISTS momo_box INT NOT NULL DEFAULT 26000;

CREATE TABLE IF NOT EXISTS products (
  id            VARCHAR(40)  PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  price         INT          NOT NULL,
  stock         INT          NOT NULL DEFAULT 0,
  sold_week     INT          NOT NULL DEFAULT 0,
  low_threshold INT          NOT NULL DEFAULT 10,
  sort_order    INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id               VARCHAR(40) PRIMARY KEY,
  name             VARCHAR(80) NOT NULL,
  balance          INT         NOT NULL DEFAULT 0,
  last_payment     DATE        NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  number      INT         NOT NULL,
  customer_id VARCHAR(40) NULL,
  method      ENUM('Cash','MoMo','Bank','Credit') NOT NULL,
  total       INT         NOT NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  sale_id    INT         NOT NULL,
  product_id VARCHAR(40) NOT NULL,
  qty        INT         NOT NULL,
  unit_price INT         NOT NULL,
  CONSTRAINT fk_item_sale    FOREIGN KEY (sale_id)    REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  category   VARCHAR(40) NOT NULL,
  amount     INT         NOT NULL,
  note       VARCHAR(120) NULL,
  method     ENUM('Cash','MoMo','Bank') NOT NULL DEFAULT 'Cash',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS method ENUM('Cash','MoMo','Bank') NOT NULL DEFAULT 'Cash';

CREATE TABLE IF NOT EXISTS payments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(40) NOT NULL,
  amount      INT         NOT NULL,
  method      ENUM('Cash','MoMo','Bank') NOT NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  label      VARCHAR(120) NOT NULL,
  type       ENUM('info','in','out','credit') NOT NULL,
  amount     INT          NOT NULL,
  method     VARCHAR(20)  NULL,
  category   VARCHAR(40)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Seed data ----------
-- (Numbers mirror the original demo: revenue this month 258,000 ·
--  expenses this month 86,400 · today's cash-out 7,000)

DELETE FROM password_resets;
DELETE FROM sessions;
DELETE FROM ledger_entries;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM payments;
DELETE FROM expenses;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM settings;
-- NOTE: users & sessions are NOT wiped — accounts survive a reseed.

-- The box values below are not arbitrary: they are what the seeded
-- books (sales, expenses, deposits below) add up to, so the boxes
-- always tie out to  opening float + net profit.
INSERT INTO settings (id, opening_float, sale_counter, cash_box, bank_box, momo_box)
VALUES (1, 53400, 145, 24100, 100000, 100900);

INSERT INTO products (id, name, price, stock, sold_week, low_threshold, sort_order) VALUES
  ('matches', 'Matches (box)',    500,  4, 32, 10, 1),
  ('soap',    'Soap bar',         700,  6, 21, 10, 2),
  ('milk',    'Milk 500ml',       800,  9, 15,  8, 3),
  ('sugar',   'Sugar 1kg',       1600, 12, 11,  6, 4),
  ('rice',    'Rice 1kg',        2000, 18,  8,  6, 5),
  ('oil',     'Cooking oil 1L',  3500, 24,  5,  4, 6);

INSERT INTO customers (id, name, balance, last_payment) VALUES
  ('amina',    'Amina U.',    2500, CURDATE() - INTERVAL 9 DAY),
  ('bosco',    'Jean Bosco',  1200, CURDATE() - INTERVAL 2 DAY),
  ('claudine', 'Claudine M.',  800, CURDATE());

-- Historical sales earlier this month (total 227,000)
INSERT INTO sales (number, method, total, created_at) VALUES
  (132, 'Cash', 40000, NOW() - INTERVAL 20 DAY),
  (133, 'MoMo', 35000, NOW() - INTERVAL 18 DAY),
  (134, 'Cash', 24000, NOW() - INTERVAL 16 DAY),
  (135, 'MoMo', 24000, NOW() - INTERVAL 14 DAY),
  (136, 'Cash', 17500, NOW() - INTERVAL 12 DAY),
  (137, 'Cash', 20000, NOW() - INTERVAL 10 DAY),
  (138, 'MoMo', 30000, NOW() - INTERVAL  8 DAY),
  (139, 'Cash', 24500, NOW() - INTERVAL  6 DAY),
  (140, 'MoMo', 11200, NOW() - INTERVAL  4 DAY),
  (141, 'Cash',   800, NOW() - INTERVAL  2 DAY);

-- Customer debts are real credit sales — every franc in the
-- credit box is backed by a sale on credit (type 'credit').
INSERT INTO sales (number, customer_id, method, total, created_at) VALUES
  (129, 'amina',    'Credit', 2500, NOW() - INTERVAL 12 DAY),
  (130, 'bosco',    'Credit', 1200, NOW() - INTERVAL  3 DAY),
  (131, 'claudine', 'Credit',  800, CONCAT(CURDATE(), ' 15:30:00'));

INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
SELECT s.id, 'rice',    1, 2000 FROM sales s WHERE s.number = 129 UNION ALL
SELECT s.id, 'matches', 1,  500 FROM sales s WHERE s.number = 129 UNION ALL
SELECT s.id, 'soap',    1,  700 FROM sales s WHERE s.number = 130 UNION ALL
SELECT s.id, 'matches', 1,  500 FROM sales s WHERE s.number = 130 UNION ALL
SELECT s.id, 'milk',    1,  800 FROM sales s WHERE s.number = 131;

INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
SELECT s.id, 'rice',    20, 2000 FROM sales s WHERE s.number = 132 UNION ALL
SELECT s.id, 'oil',     10, 3500 FROM sales s WHERE s.number = 133 UNION ALL
SELECT s.id, 'sugar',   15, 1600 FROM sales s WHERE s.number = 134 UNION ALL
SELECT s.id, 'milk',    30,  800 FROM sales s WHERE s.number = 135 UNION ALL
SELECT s.id, 'soap',    25,  700 FROM sales s WHERE s.number = 136 UNION ALL
SELECT s.id, 'matches', 40,  500 FROM sales s WHERE s.number = 137 UNION ALL
SELECT s.id, 'rice',    15, 2000 FROM sales s WHERE s.number = 138 UNION ALL
SELECT s.id, 'oil',      7, 3500 FROM sales s WHERE s.number = 139 UNION ALL
SELECT s.id, 'sugar',    7, 1600 FROM sales s WHERE s.number = 140 UNION ALL
SELECT s.id, 'milk',     1,  800 FROM sales s WHERE s.number = 141;

-- Today's three sales (total 31,000)
INSERT INTO sales (number, method, total, created_at) VALUES
  (142, 'Cash',  6500, CONCAT(CURDATE(), ' 09:12:00')),
  (143, 'Cash', 12400, CONCAT(CURDATE(), ' 10:05:00')),
  (144, 'MoMo', 12100, CONCAT(CURDATE(), ' 13:20:00'));

INSERT INTO sale_items (sale_id, product_id, qty, unit_price)
SELECT s.id, 'matches', 5, 500 FROM sales s WHERE s.number = 142 UNION ALL
SELECT s.id, 'milk',    5, 800 FROM sales s WHERE s.number = 142 UNION ALL
SELECT s.id, 'rice',    2, 2000 FROM sales s WHERE s.number = 143 UNION ALL
SELECT s.id, 'oil',     2, 3500 FROM sales s WHERE s.number = 143 UNION ALL
SELECT s.id, 'soap',    2, 700 FROM sales s WHERE s.number = 143 UNION ALL
SELECT s.id, 'sugar',   2, 1600 FROM sales s WHERE s.number = 144 UNION ALL
SELECT s.id, 'rice',    2, 2000 FROM sales s WHERE s.number = 144 UNION ALL
SELECT s.id, 'oil',     1, 3500 FROM sales s WHERE s.number = 144 UNION ALL
SELECT s.id, 'soap',    2, 700 FROM sales s WHERE s.number = 144;

-- Expenses: 79,400 earlier this month + 7,000 today (4 entries)
INSERT INTO expenses (category, amount, note, method, created_at) VALUES
  ('Rent',      40000, 'Monthly shop rent',  'Cash', NOW() - INTERVAL 15 DAY),
  ('Stock',     25000, 'Wholesale restock',  'Cash', NOW() - INTERVAL 7 DAY),
  ('Utilities',  6400, 'Electricity bill',   'MoMo', NOW() - INTERVAL 3 DAY),
  ('Transport',  4000, 'Taxi to market',     'Cash', NOW() - INTERVAL 3 DAY),
  ('Airtime',    4000, 'Data bundles',       'MoMo', NOW() - INTERVAL 2 DAY),
  ('Transport',  2000, 'Taxi to market',     'Cash', CONCAT(CURDATE(), ' 11:30:00')),
  ('Staff',      3200, 'Staff lunch',        'Cash', CONCAT(CURDATE(), ' 12:15:00')),
  ('Airtime',    1000, 'Airtime card',       'MoMo', CONCAT(CURDATE(), ' 14:00:00')),
  ('Stock',       800, 'Plastic bags',       'Cash', CONCAT(CURDATE(), ' 16:40:00'));

-- Full cash books. The money boxes are derived from these entries
-- (opening float + every 'in' − every 'out', bucketed by method),
-- so every box amount below is explainable:
--   cash = 53,400 + 126,800 + 18,900 − 75,000 − 100,000 = 24,100
--   bank = 100,000 (two cash deposits)          = 100,000
--   momo = 100,200 + 12,100 − 11,400 − 1,000    = 100,900
--   credit = 2,500 + 1,200 + 800 (owed)         =  4,500
--   TOTAL = 229,500 = 53,400 opening + 176,100 profit to date
-- (sales 262,500 − expenses 86,400 = 176,100 profit ✓)

-- Historical sales earlier this month → the boxes they filled
INSERT INTO ledger_entries (label, type, amount, method, created_at) VALUES
  ('Sale #132', 'in', 40000, 'Cash', NOW() - INTERVAL 20 DAY),
  ('Sale #133', 'in', 35000, 'MoMo', NOW() - INTERVAL 18 DAY),
  ('Sale #134', 'in', 24000, 'Cash', NOW() - INTERVAL 16 DAY),
  ('Sale #135', 'in', 24000, 'MoMo', NOW() - INTERVAL 14 DAY),
  ('Sale #136', 'in', 17500, 'Cash', NOW() - INTERVAL 12 DAY),
  ('Sale #137', 'in', 20000, 'Cash', NOW() - INTERVAL 10 DAY),
  ('Sale #138', 'in', 30000, 'MoMo', NOW() - INTERVAL  8 DAY),
  ('Sale #139', 'in', 24500, 'Cash', NOW() - INTERVAL  6 DAY),
  ('Sale #140', 'in', 11200, 'MoMo', NOW() - INTERVAL  4 DAY),
  ('Sale #141', 'in',   800, 'Cash', NOW() - INTERVAL  2 DAY);

-- Historical expenses earlier this month → the boxes they drained
INSERT INTO ledger_entries (label, type, amount, method, category, created_at) VALUES
  ('Monthly shop rent', 'out', 40000, 'Cash', 'Rent',      NOW() - INTERVAL 15 DAY),
  ('Wholesale restock', 'out', 25000, 'Cash', 'Stock',     NOW() - INTERVAL  7 DAY),
  ('Electricity bill',  'out',  6400, 'MoMo', 'Utilities', NOW() - INTERVAL  3 DAY),
  ('Taxi to market',    'out',  4000, 'Cash', 'Transport', NOW() - INTERVAL  3 DAY),
  ('Data bundles',      'out',  4000, 'MoMo', 'Airtime',   NOW() - INTERVAL  2 DAY);

-- Banked the week's cash twice (cash box → bank box)
INSERT INTO ledger_entries (label, type, amount, method, category, created_at) VALUES
  ('Bank deposit', 'out', 50000, 'Cash', 'Transfer', NOW() - INTERVAL 15 DAY),
  ('Bank deposit', 'in',  50000, 'Bank', 'Transfer', NOW() - INTERVAL 15 DAY),
  ('Bank deposit', 'out', 50000, 'Cash', 'Transfer', NOW() - INTERVAL  5 DAY),
  ('Bank deposit', 'in',  50000, 'Bank', 'Transfer', NOW() - INTERVAL  5 DAY);

-- Credit sales — they sit in the credit box until customers pay
INSERT INTO ledger_entries (label, type, amount, method, created_at) VALUES
  ('Sale (credit) · Amina U.',    'credit', 2500, 'Credit', NOW() - INTERVAL 12 DAY),
  ('Sale (credit) · Jean Bosco',  'credit', 1200, 'Credit', NOW() - INTERVAL  3 DAY);

-- Today's cash ledger (matches the sales/expenses above)
INSERT INTO ledger_entries (label, type, amount, method, category, created_at) VALUES
  ('Opening float', 'info', 53400, NULL, NULL,       CONCAT(CURDATE(), ' 08:00:00')),
  ('Sale #142',     'in',    6500, 'Cash', NULL,     CONCAT(CURDATE(), ' 09:12:00')),
  ('Sale #143',     'in',   12400, 'Cash', NULL,     CONCAT(CURDATE(), ' 10:05:00')),
  ('Transport',     'out',   2000, 'Cash', 'Transport',CONCAT(CURDATE(), ' 11:30:00')),
  ('Staff lunch',   'out',   3200, 'Cash', 'Staff',    CONCAT(CURDATE(), ' 12:15:00')),
  ('Sale #144',     'in',   12100, 'MoMo', NULL,     CONCAT(CURDATE(), ' 13:20:00')),
  ('Airtime',       'out',   1000, 'MoMo', 'Airtime',  CONCAT(CURDATE(), ' 14:00:00')),
  ('Sale (credit) · Claudine M.', 'credit', 800, 'Credit', NULL, CONCAT(CURDATE(), ' 15:30:00')),
  ('Plastic bags',  'out',    800, 'Cash', 'Stock',    CONCAT(CURDATE(), ' 16:40:00'));

-- ---------- Demo account ----------
-- Password: demo1234  (PBKDF2-SHA512, 150k iterations, static salt)
-- INSERT IGNORE keeps the account when the seed re-runs; seed.js
-- always refreshes the hash with the machine's own secret anyway.
INSERT IGNORE INTO users (name, email, password_hash, role, shop_name) VALUES
  ('Demo Owner', 'demo@biztrack.app',
   'a4c9e2f17b8d63504a19c7e2f17b8d63:80369042a73a2b2908a9549248bf7f0226e5a8f662801a8e1039d0ca4039311f417b78ea46b045dbd1ac06f633e9c9292847bfa93b39d9b93fb564ef6006fba1',
   'owner', 'KDN Shop');
