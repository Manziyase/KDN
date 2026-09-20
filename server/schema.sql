-- ============================================================
-- BizTrack Lite — MySQL schema & demo seed data
--
-- Works with XAMPP's MySQL/MariaDB. Run with either:
--   • phpMyAdmin  → Import → this file
--   • npm run seed  (uses the Node connection in server/config.js)
--   • C:\xampp\mysql\bin\mysql.exe -u root < server\schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS biztrack
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biztrack;

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS settings (
  id            TINYINT UNSIGNED PRIMARY KEY,
  opening_float INT  NOT NULL DEFAULT 53400,
  sale_counter  INT  NOT NULL DEFAULT 145
);

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
  method      ENUM('Cash','MoMo','Credit') NOT NULL,
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
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

DELETE FROM ledger_entries;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM payments;
DELETE FROM expenses;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM settings;

INSERT INTO settings (id, opening_float, sale_counter) VALUES (1, 53400, 145);

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
  ('claudine', 'Claudine M.',  850, CURDATE());

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
INSERT INTO expenses (category, amount, note, created_at) VALUES
  ('Rent',      40000, 'Monthly shop rent',  NOW() - INTERVAL 15 DAY),
  ('Stock',     25000, 'Wholesale restock',  NOW() - INTERVAL 7 DAY),
  ('Utilities',  6400, 'Electricity bill',   NOW() - INTERVAL 3 DAY),
  ('Transport',  4000, 'Taxi to market',     NOW() - INTERVAL 3 DAY),
  ('Airtime',    4000, 'Data bundles',       NOW() - INTERVAL 2 DAY),
  ('Transport',  2000, 'Taxi to market',     CONCAT(CURDATE(), ' 11:30:00')),
  ('Staff',      3200, 'Staff lunch',        CONCAT(CURDATE(), ' 12:15:00')),
  ('Airtime',    1000, 'Airtime card',       CONCAT(CURDATE(), ' 14:00:00')),
  ('Stock',       800, 'Plastic bags',       CONCAT(CURDATE(), ' 16:40:00'));

-- Today's cash ledger (matches the sales/expenses above)
INSERT INTO ledger_entries (label, type, amount, method, category, created_at) VALUES
  ('Opening float', 'info', 53400, NULL, NULL,       CONCAT(CURDATE(), ' 08:00:00')),
  ('Sale #142',     'in',    6500, 'Cash', NULL,     CONCAT(CURDATE(), ' 09:12:00')),
  ('Sale #143',     'in',   12400, 'Cash', NULL,     CONCAT(CURDATE(), ' 10:05:00')),
  ('Transport',     'out',   2000, NULL, 'Transport',CONCAT(CURDATE(), ' 11:30:00')),
  ('Staff lunch',   'out',   3200, NULL, 'Staff',    CONCAT(CURDATE(), ' 12:15:00')),
  ('Sale #144',     'in',   12100, 'MoMo', NULL,     CONCAT(CURDATE(), ' 13:20:00')),
  ('Airtime',       'out',   1000, NULL, 'Airtime',  CONCAT(CURDATE(), ' 14:00:00')),
  ('Plastic bags',  'out',    800, NULL, 'Stock',    CONCAT(CURDATE(), ' 16:40:00'));
