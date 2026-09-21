/* ============================================================
   BizTrack Lite — application store (MySQL-backed)

   Data lives in MySQL (see server/schema.sql). On boot the store
   fetches /api/bootstrap — which returns exactly the state shape
   every page renders — and actions POST to the API, then
   reconcile local state with the server's authoritative result.

   If the API is unreachable (MySQL down, or the page opened
   without the server), the store transparently falls back to
   the original localStorage demo mode so the UI keeps working.

   Console:  BT.store.reset()   ·   BT.store.online
   ============================================================ */

window.BT = window.BT || {};

(function () {
  'use strict';

  var STORAGE_KEY = 'biztrack-lite-v1';

  /* Active preferences (currency, language, theme, accent).
     Saved to localStorage; synced to the signed-in user's
     MySQL profile on the Settings page. */
  BT.prefs = {
    currency: 'RWF',
    language: 'en',
    theme: 'light',
    accent: 'navy'
  };

  /* Offline/demo fallback snapshot — mirrors the seed data */
  var DEFAULTS = {
    date: 'Monday, 23 June 2026',
    openingFloat: 53400,
    revenuePeriod: 258000,
    expensesPeriod: 86400,
    saleCounter: 145,

    /* Where the money sits. The credit box = customer debt. */
    boxes: { cash: 53400, bank: 120000, momo: 26000, credit: 4550 },

    items: [
      { id: 'matches', name: 'Matches (box)',   price: 500,  stock: 4,  soldWeek: 32, low: 10 },
      { id: 'soap',    name: 'Soap bar',        price: 700,  stock: 6,  soldWeek: 21, low: 10 },
      { id: 'milk',    name: 'Milk 500ml',      price: 800,  stock: 9,  soldWeek: 15, low: 8 },
      { id: 'sugar',   name: 'Sugar 1kg',       price: 1600, stock: 12, soldWeek: 11, low: 6 },
      { id: 'rice',    name: 'Rice 1kg',        price: 2000, stock: 18, soldWeek: 8,  low: 6 },
      { id: 'oil',     name: 'Cooking oil 1L',  price: 3500, stock: 24, soldWeek: 5,  low: 4 }
    ],

    customers: [
      { id: 'amina',    name: 'Amina U.',    balance: 2500, lastPayment: '11 Jun' },
      { id: 'bosco',    name: 'Jean Bosco',  balance: 1200, lastPayment: '18 Jun' },
      { id: 'claudine', name: 'Claudine M.', balance: 850,  lastPayment: '20 Jun' }
    ],

    /* Cash ledger for today. type: 'info' | 'in' | 'out' | 'credit' */
    ledger: [
      { time: '08:00', label: 'Opening float', type: 'info', amount: 53400 },
      { time: '09:12', label: 'Sale #142',     type: 'in',   amount: 6500,  method: 'Cash' },
      { time: '10:05', label: 'Sale #143',     type: 'in',   amount: 12400, method: 'Cash' },
      { time: '11:30', label: 'Transport',     type: 'out',  amount: 2000,  category: 'Transport' },
      { time: '12:15', label: 'Staff lunch',   type: 'out',  amount: 3200,  category: 'Staff' },
      { time: '13:20', label: 'Sale #144',     type: 'in',   amount: 12100, method: 'MoMo' },
      { time: '14:00', label: 'Airtime',       type: 'out',  amount: 1000,  category: 'Airtime' },
      { time: '16:40', label: 'Plastic bags',  type: 'out',  amount: 800,   category: 'Stock' }
    ]
  };

  function nowTime() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function todayShort() {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var d = new Date();
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* storage unavailable — run in-memory */
    }
    return clone(DEFAULTS);
  }

  BT.store = {
    state: load(),

    /* true once /api/bootstrap has answered successfully */
    online: false,

  /* ---------- Boot ---------- */

  init: function () {
    var self = this;
    if (!BT.api) return Promise.resolve(false);

    return BT.api.get('/bootstrap').then(function (data) {
      self.state = data;
      self.online = true;
      self.save(); /* cache the snapshot for offline fallback */
      return true;
    }).catch(function () {
      console.warn('[BizTrack] API unreachable — running in offline demo mode.');
      self.online = false;
      return false;
    });
  },

  /* Retry the server after a failed boot (used by the "Try to
     reconnect" button on the auth hub). Resolves true when the
     API answers, false when it still isn't there. */
  reconnect: function () {
    var self = this;
    if (!BT.api) return Promise.resolve(false);
    return BT.api.get('/bootstrap').then(function (data) {
      self.state = data;
      self.online = true;
      self.save();
      return true;
    }).catch(function () { return false; });
  },

  /* ---------- Money boxes (offline/demo fallback only —
     online, the server returns authoritative boxes on every
     action and they are assigned straight into state.boxes) */

    /* ---------- Preferences (currency / language / theme) ---------- */

    applyPrefs: function (p) {
      var self = this;
      Object.keys(BT.prefs).forEach(function (k) {
        if (p[k] !== undefined) BT.prefs[k] = p[k];
      });
      try {
        localStorage.setItem('biztrack-prefs', JSON.stringify(BT.prefs));
      } catch (e) { /* ignore */ }
      if (this.online && BT.api) {
        return BT.api.post('/prefs', BT.prefs).catch(function (err) {
          console.warn('[BizTrack] Pref sync failed:', err.message);
          self.online = false; /* session expired — keep local only */
        });
      }
      return Promise.resolve();
    },

    /* ---------- Money boxes ---------- */

    boxes: function () {
      var b = this.state.boxes || { cash: 0, bank: 0, momo: 0 };
      return {
        cash: b.cash || 0,
        bank: b.bank || 0,
        momo: b.momo || 0,
        credit: this.creditOwed()
      };
    },

    totalMoney: function () {
      var b = this.boxes();
      return b.cash + b.bank + b.momo + b.credit;
    },

    /* The box a payment method lands in / leaves from.
       Unknown methods (e.g. 'Credit') return null — credit is
       tracked per-customer, never as cash in a box. */
    boxForMethod: function (method) {
      if (method === 'MoMo') return 'momo';
      if (method === 'Bank') return 'bank';
      if (method === 'Cash' || method === undefined || method === null) return 'cash';
      return null;
    },

    /* Add/subtract an amount from one physical box (offline only).
       A method of 'Credit' (or anything unknown) is ignored. */
    boxMove: function (method, amount, sign) {
      var b = this.state.boxes;
      if (!b) return;
      var box = this.boxForMethod(method);
      if (!box) return;
      b[box] = Math.max(0, (b[box] || 0) + sign * amount);
    },

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        /* ignore */
      }
    },

    reset: function () {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.post('/reset').then(function () { return self.init(); });
      }
      this.state = clone(DEFAULTS);
      this.save();
      return Promise.resolve();
    },

    /* ---------- Derived numbers ---------- */

    todaySales: function () {
      return this.state.ledger.reduce(function (sum, e) {
        return (e.type === 'in' || e.type === 'credit') ? sum + e.amount : sum;
      }, 0);
    },

    todayExpenses: function () {
      return this.state.ledger.reduce(function (sum, e) {
        return e.type === 'out' ? sum + e.amount : sum;
      }, 0);
    },

    closing: function () {
      return this.state.openingFloat + this.todaySales() - this.todayExpenses();
    },

    creditOwed: function () {
      return this.state.customers.reduce(function (sum, c) {
        return sum + Math.max(0, c.balance);
      }, 0);
    },

    lowStock: function () {
      return this.state.items.filter(function (i) {
        return i.stock <= i.low;
      });
    },

    lowStockCount: function () {
      return this.lowStock().length;
    },

    lastEntries: function (n) {
      return this.state.ledger.slice(-n);
    },

    /* ---------- Actions ----------
       Each action updates local state immediately (so the UI is
       instant and works offline), then syncs with the server and
       reconciles the authoritative numbers it returns. */

    recordSale: function (sale) {
      var item = this.state.items.find(function (i) { return i.id === sale.itemId; });
      if (!item) return null;

      var qty = Math.max(1, Math.round(sale.qty));
      var total = item.price * qty;

      item.stock = Math.max(0, item.stock - qty);
      item.soldWeek += qty;

      var cust = null;
      var label = 'Sale #' + (this.state.saleCounter++);
      if (sale.method === 'Credit') {
        cust = this.state.customers.find(function (c) { return c.id === sale.customerId; });
        if (cust) {
          cust.balance += total;
          label = 'Sale (credit) · ' + cust.name;
        }
      }

      var entry = {
        time: nowTime(),
        label: label,
        type: sale.method === 'Credit' ? 'credit' : 'in',
        amount: total,
        method: sale.method
      };
      this.state.ledger.push(entry);

      /* A paid sale lands in the box matching its method (Cash →
         cash box, MoMo → momo box, Bank → bank box). Credit sales
         are not real money yet — they live in the credit box via
         the customer's balance. */
      this.boxMove(sale.method, total, +1);
      this.state.revenuePeriod += total;
      this.save();

      if (this.online && BT.api) {
        var self = this;
        BT.api.post('/sales', {
          itemId: sale.itemId, qty: qty,
          method: sale.method, customerId: sale.customerId
        }).then(function (r) {
          if (!r || r.ok === false) return;
          Object.assign(item, r.item);
          if (cust && r.customer) cust.balance = r.customer.balance;
          if (!cust && r.customer === null) cust = null;
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          if (r.period) {
            self.state.revenuePeriod = r.period.revenue;
            self.state.expensesPeriod = r.period.expenses;
          }
          if (r.boxes) self.state.boxes = r.boxes; /* server is authoritative */
          self.state.saleCounter = Math.max(self.state.saleCounter, r.saleNumber + 1);
          self.save();
        }).catch(function (err) {
          console.warn('[BizTrack] Sale sync failed:', err.message);
        });
      }
      return total;
    },

    recordExpense: function (exp) {
      var amount = Math.max(0, Math.round(exp.amount));
      if (!amount) return null;

      var entry = {
        time: nowTime(),
        label: exp.note || exp.category,
        type: 'out',
        amount: amount,
        method: exp.method,
        category: exp.category
      };
      this.state.ledger.push(entry);
      this.state.expensesPeriod += amount;
      this.state.expenseCounter = (this.state.expenseCounter || 0) + 1;
      /* money leaves the box it was paid from */
      this.boxMove(exp.method, amount, -1);
      this.save();

      if (this.online && BT.api) {
        var self = this;
        BT.api.post('/expenses', {
          category: exp.category, amount: amount,
          note: exp.note || '', method: exp.method || 'Cash'
        }).then(function (r) {
          if (!r || r.ok === false) return;
          self.state.revenuePeriod = r.period.revenue;
          self.state.expensesPeriod = r.period.expenses;
          if (r.boxes) self.state.boxes = r.boxes;
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          self.save();
        }).catch(function (err) {
          console.warn('[BizTrack] Expense sync failed:', err.message);
        });
      }
      return amount;
    },

    /* Add a brand-new product (optionally buying initial stock,
      which is booked as a Stock expense from the chosen box). */
    addProduct: function (prod) {
      var self = this;
      var local = {
        id: String(prod.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'item',
        name: prod.name,
        price: Math.round(prod.price),
        stock: Math.max(0, Math.round(prod.stock || 0)),
        soldWeek: 0,
        low: Math.max(1, Math.round(prod.low || 10))
      };
      this.state.items.push(local);
      if (local.stock > 0) {
        var cost = local.price * local.stock;
        this.state.expensesPeriod += cost;
        this.boxMove(prod.method, cost, -1);
        this.state.ledger.push({
          time: nowTime(), label: 'Stock purchase · ' + local.name,
          type: 'out', amount: cost, method: prod.method, category: 'Stock'
        });
      }
      this.save();

      if (this.online && BT.api) {
        return BT.api.post('/products', {
          name: prod.name, price: local.price, stock: local.stock,
          low: local.low, method: prod.method || null
        }).then(function (r) {
          if (r && r.ok !== false && r.period) {
            self.state.revenuePeriod = r.period.revenue;
            self.state.expensesPeriod = r.period.expenses;
            self.save();
          }
          return true;
        }).catch(function (err) {
          BT.ui.toast(err.message);
          return false;
        });
      }
      return Promise.resolve(true);
    },

    /* Buy more stock for an existing product. */
    restock: function (itemId, qty, method) {
      var self = this;
      var item = this.state.items.find(function (i) { return i.id === itemId; });
      if (!item) return Promise.resolve(false);

      qty = Math.max(1, Math.round(qty));
      var cost = item.price * qty;
      item.stock += qty;
      this.state.expensesPeriod += cost;
      this.boxMove(method, cost, -1);
      this.state.ledger.push({
        time: nowTime(), label: 'Restock · ' + item.name,
        type: 'out', amount: cost, method: method, category: 'Stock'
      });
      this.save();

      if (this.online && BT.api) {
        return BT.api.post('/products/' + encodeURIComponent(itemId) + '/restock', {
          qty: Math.round(qty), method: method
        }).then(function (r) {
          if (r && r.ok !== false) {
            if (r.period) {
              self.state.revenuePeriod = r.period.revenue;
              self.state.expensesPeriod = r.period.expenses;
            }
            item.stock = Math.max(item.stock, r.stock);
            if (r.boxes) self.state.boxes = r.boxes;
            self.save();
          }
          return true;
        }).catch(function (err) {
          BT.ui.toast(err.message);
          return false;
        });
      }
      return Promise.resolve(true);
    },

    /* Move money between the physical boxes (cash/bank/momo).
       Never changes the total — only where the money sits. */
    transferBoxes: function (from, to, amount) {
      var self = this;
      var amt = Math.max(0, Math.round(amount));
      var b = this.state.boxes;
      if (!b || !amt || from === to || !b[from] || b[from] < amt) return false;
      b[from] -= amt;
      b[to] = (b[to] || 0) + amt;
      this.state.ledger.push({
        time: nowTime(),
        label: from.charAt(0).toUpperCase() + from.slice(1) + ' → ' + to.charAt(0).toUpperCase() + to.slice(1) + ' transfer',
        type: 'info', amount: amt, method: to, category: 'Transfer'
      });
      this.save();

      if (this.online && BT.api) {
        BT.api.post('/boxes/transfer', { from: from + '_box', to: to + '_box', amount: amt })
          .then(function (r) {
            if (r && r.boxes) {
              self.state.boxes = r.boxes;
              self.save();
            }
          }).catch(function (err) {
            console.warn('[BizTrack] Transfer sync failed:', err.message);
          });
      }
      return true;
    },

    recordPayment: function (pay) {
      var cust = this.state.customers.find(function (c) { return c.id === pay.customerId; });
      if (!cust) return null;

      var amount = Math.max(0, Math.round(pay.amount));
      if (!amount) return null;

      cust.balance = Math.max(0, cust.balance - amount);
      cust.lastPayment = todayShort(); /* replaced by server response when online */

      var entry = {
        time: nowTime(),
        label: 'Payment · ' + cust.name,
        type: 'in',
        amount: amount,
        method: pay.method
      };
      this.state.ledger.push(entry);
      /* the received money lands in the box it was paid into */
      this.boxMove(pay.method, amount, +1);
      this.save();

      if (this.online && BT.api) {
        var self = this;
        BT.api.post('/payments', {
          customerId: cust.id, amount: amount, method: pay.method
        }).then(function (r) {
          if (!r || r.ok === false) return;
          cust.balance = r.customer.balance;
          cust.lastPayment = r.customer.lastPayment;
          if (r.boxes) self.state.boxes = r.boxes;
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          self.save();
        }).catch(function (err) {
          console.warn('[BizTrack] Payment sync failed:', err.message);
        });
      }
      return amount;
    },

    /* ============================================================
       CRUD — products / customers / expenses
       Online, every method calls the API and adopts the server's
       authoritative answer; offline they act on the demo snapshot
       (expense editing needs the server's books, so it is blocked).
       ============================================================ */

    /* ---------- Products: update / delete ---------- */

    updateProduct: function (id, changes) {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.put('/products/' + encodeURIComponent(id), changes).then(function (r) {
          if (!r || r.ok === false) return false;
          var item = self.state.items.find(function (i) { return i.id === id; });
          if (item && r.item) Object.assign(item, r.item);
          self.save();
          return true;
        });
      }
      var item = this.state.items.find(function (i) { return i.id === id; });
      if (!item) return Promise.reject(new Error('Unknown item'));
      item.name = changes.name || item.name;
      item.price = Math.round(Number(changes.price) || item.price);
      item.low = Math.max(1, Math.round(Number(changes.low) || item.low));
      this.save();
      return Promise.resolve(true);
    },

    deleteProduct: function (id) {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.del('/products/' + encodeURIComponent(id)).then(function (r) {
          if (!r || r.ok === false) return false;
          self.state.items = self.state.items.filter(function (i) { return i.id !== id; });
          self.save();
          return true;
        });
      }
      /* offline: past sales keep their totals in the ledger, so
         removing the item itself is always safe locally */
      this.state.items = this.state.items.filter(function (i) { return i.id !== id; });
      this.save();
      return Promise.resolve(true);
    },

    /* ---------- Customers: add / rename / remove ---------- */

    addCustomer: function (name) {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.post('/customers', { name: name }).then(function (r) {
          if (!r || r.ok === false) return false;
          if (!self.state.customers.some(function (c) { return c.id === r.customer.id; })) {
            self.state.customers.push(r.customer);
            self.state.customers.sort(function (a, b) { return a.name.localeCompare(b.name); });
          }
          self.save();
          return true;
        });
      }
      var id = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'customer';
      if (this.state.customers.some(function (c) { return c.id === id; })) {
        return Promise.reject(new Error('A customer with this name already exists'));
      }
      this.state.customers.push({ id: id, name: name, balance: 0, lastPayment: '—' });
      this.save();
      return Promise.resolve(true);
    },

    updateCustomer: function (id, name) {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.put('/customers/' + encodeURIComponent(id), { name: name }).then(function (r) {
          if (!r || r.ok === false) return false;
          var cust = self.state.customers.find(function (c) { return c.id === id; });
          if (cust && r.customer) cust.name = r.customer.name;
          self.save();
          return true;
        });
      }
      var cust = this.state.customers.find(function (c) { return c.id === id; });
      if (!cust) return Promise.reject(new Error('Unknown customer'));
      cust.name = name;
      this.save();
      return Promise.resolve(true);
    },

    deleteCustomer: function (id) {
      var self = this;
      if (this.online && BT.api) {
        return BT.api.del('/customers/' + encodeURIComponent(id)).then(function (r) {
          if (!r || r.ok === false) return false;
          self.state.customers = self.state.customers.filter(function (c) { return c.id !== id; });
          self.save();
          return true;
        });
      }
      var cust = this.state.customers.find(function (c) { return c.id === id; });
      if (cust && cust.balance > 0) {
        return Promise.reject(new Error(cust.name + ' still owes ' + cust.balance + ' — record a payment first'));
      }
      this.state.customers = this.state.customers.filter(function (c) { return c.id !== id; });
      this.save();
      return Promise.resolve(true);
    },

    /* ---------- Expenses: full history (the Expenses page shows
       today's ledger; this fetches every recorded expense) ---------- */

    expenseHistory: function (limit) {
      if (this.online && BT.api) {
        return BT.api.get('/expenses?limit=' + (limit || 50)).then(function (r) {
          return (r && r.expenses) || [];
        });
      }
      /* offline demo: rebuild rows from the snapshot's ledger */
      return Promise.resolve(this.state.ledger.filter(function (e) { return e.type === 'out'; })
        .map(function (e, i) {
          return {
            id: -(i + 1), category: e.category || 'Other', amount: e.amount,
            note: e.label && e.label !== e.category ? e.label : '',
            method: e.method || 'Cash', date: 'Today', time: e.time
          };
        }));
    },

    updateExpense: function (id, changes) {
      var self = this;
      if (!this.online || !BT.api) return Promise.reject(new Error('Sign in to edit expenses'));
      return BT.api.put('/expenses/' + encodeURIComponent(id), changes).then(function (r) {
        if (!r || r.ok === false) return false;
        if (r.period) {
          self.state.revenuePeriod = r.period.revenue;
          self.state.expensesPeriod = r.period.expenses;
        }
        self.save();
        return true;
      });
    },

    deleteExpense: function (id) {
      var self = this;
      if (!this.online || !BT.api) return Promise.reject(new Error('Sign in to delete expenses'));
      return BT.api.del('/expenses/' + encodeURIComponent(id)).then(function (r) {
        if (!r || r.ok === false) return false;
        if (r.period) {
          self.state.revenuePeriod = r.period.revenue;
          self.state.expensesPeriod = r.period.expenses;
        }
        self.save();
        return true;
      });
    },

    /* ---------- Start from zero (new-shop handover) ----------
       Server wipes inventory, customers, sales, expenses and the
       ledger, and zeroes every money box. The signed-in user is
       kept. Online the server's empty state is adopted; offline
       the local snapshot is zeroed instead. */

    zeroOut: function () {
      var self = this;
      function emptyState() {
        self.state.items = [];
        self.state.customers = [];
        self.state.ledger = [{ time: '08:00', label: 'Starting fresh', type: 'info', amount: 0 }];
        self.state.openingFloat = 0;
        self.state.saleCounter = 1;
        self.state.revenuePeriod = 0;
        self.state.expensesPeriod = 0;
        self.state.boxes = { cash: 0, bank: 0, momo: 0, credit: 0 };
        self.save();
      }
      if (this.online && BT.api) {
        return BT.api.post('/zero').then(function (r) {
          if (!r || r.ok === false) return false;
          emptyState();
          return true;
        });
      }
      emptyState();
      return Promise.resolve(true);
    }
  };
})();
