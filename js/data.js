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

  /* Offline/demo fallback snapshot — mirrors the seed data */
  var DEFAULTS = {
    date: 'Monday, 23 June 2026',
    openingFloat: 53400,
    revenuePeriod: 258000,
    expensesPeriod: 86400,
    saleCounter: 145,

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
        return false;
      });
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
        return e.type === 'in' ? sum + e.amount : sum;
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
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          self.state.revenuePeriod = r.period.revenue;
          self.state.expensesPeriod = r.period.expenses;
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
        category: exp.category
      };
      this.state.ledger.push(entry);
      this.state.expensesPeriod += amount;
      this.save();

      if (this.online && BT.api) {
        var self = this;
        BT.api.post('/expenses', {
          category: exp.category, amount: amount, note: exp.note || ''
        }).then(function (r) {
          if (!r || r.ok === false) return;
          self.state.revenuePeriod = r.period.revenue;
          self.state.expensesPeriod = r.period.expenses;
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          self.save();
        }).catch(function (err) {
          console.warn('[BizTrack] Expense sync failed:', err.message);
        });
      }
      return amount;
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
      this.save();

      if (this.online && BT.api) {
        var self = this;
        BT.api.post('/payments', {
          customerId: cust.id, amount: amount, method: pay.method
        }).then(function (r) {
          if (!r || r.ok === false) return;
          cust.balance = r.customer.balance;
          cust.lastPayment = r.customer.lastPayment;
          var i = self.state.ledger.indexOf(entry);
          if (i !== -1) self.state.ledger[i] = r.ledgerEntry;
          self.save();
        }).catch(function (err) {
          console.warn('[BizTrack] Payment sync failed:', err.message);
        });
      }
      return amount;
    }
  };
})();
