/* ============================================================
   BizTrack Lite — i18n (English · Kinyarwanda · French · Swahili)

   BT.i18n.t('key') returns the translated string for the active
   language. The language is set from the signed-in user's
   preferences (Settings page). Missing keys fall back to English.
   ============================================================ */

window.BT = window.BT || {};

BT.i18n = (function () {
  'use strict';

  var DICTS = {
    en: {
      nav_overview: 'Overview', nav_daily: 'Daily work', nav_manage: 'Manage', nav_general: 'General',
      nav_dashboard: 'Dashboard', nav_new_sale: 'New sale', nav_new_expense: 'New expense',
      nav_add_payment: 'Add payment', nav_inventory: 'Inventory', nav_customers: 'Customers',
      nav_ledger: 'Cash ledger', nav_expenses: 'Expenses', nav_notifications: 'Notifications',
      nav_boxes: 'Money boxes', nav_settings: 'Settings', nav_profile: 'My profile',
      sign_out: 'Sign out', sign_in: 'Sign in', sign_up: 'Sign up',
      quick_actions: 'Quick actions', recent_activity: 'Recent activity', low_stock: 'Low stock',
      where_money: 'Where is my money?', cash_box: 'Cash box', bank_box: 'Bank box',
      momo_box: 'MoMo box', credit_box: 'Credit box', total_money: 'Total money',
      view_boxes: 'View boxes', closing_balance: 'Closing balance', opening: 'Opening',
      today_sales: "Today's sales", expenses: 'Expenses', all_items: 'All items',
      item: 'Item', price: 'Price', in_stock: 'In stock', sold_week: 'Sold this week',
      status: 'Status', stock_value: 'Stock value', items: 'Items', need_restock: 'Need restocking',
      add_item: 'Add item', restock: 'Restock', save: 'Save', cancel: 'Cancel',
      amount: 'Amount', category: 'Category', note: 'Note', payment_method: 'Paid from',
      welcome_back: 'Welcome back', settings: 'Settings', appearance: 'Appearance',
      language: 'Language', currency: 'Currency', theme: 'Theme', accent_color: 'Accent color',
      light: 'Light', dark: 'Dark', profile: 'Profile'
    },
    rw: {
      nav_overview: 'Incamake', nav_daily: 'Ibikorwa bya munsi', nav_manage: 'Gucunga',
      nav_general: 'Ikigenzo', nav_dashboard: 'Imbonerahamwe', nav_new_sale: 'Gurisha rishya',
      nav_new_expense: 'Ikirwanjishya', nav_add_payment: 'Kwishyura',
      nav_inventory: 'Ibikubiyemo', nav_customers: 'Abakiriya', nav_ledger: 'Iteka ry\'amafaranga',
      nav_expenses: 'Ibirwanjishya', nav_notifications: 'Amatangazo',
      nav_boxes: 'Amasanduku y\'amafaranga', nav_settings: 'Igenamiterere', nav_profile: 'Umwirondoro wanjye',
      sign_out: 'Sohoka', sign_in: 'Injira', sign_up: 'Iyandikishe',
      quick_actions: 'Ibikorwa byihuse', recent_activity: 'Ibyakozwe vuba', low_stock: 'Ibipfa',
      where_money: 'Amafaranga yange ari he?', cash_box: 'Isanduku ry\'amafaranga',
      bank_box: 'Isanduku rya banki', momo_box: 'Isanduku rya MoMo', credit_box: 'Isanduku ry\'inguzanyo',
      total_money: 'Amafaranga yose', view_boxes: 'Reba amasanduku', closing_balance: 'Amafaranga yasigaye',
      opening: 'Utangiye', today_sales: 'Ibyagurishijwe uyu munsi', expenses: 'Ikirwanjishya',
      all_items: 'Ibintu byose', item: 'Ikintu', price: 'Igiciro', in_stock: 'Ibihari',
      sold_week: 'Byagurishijwe iki cyumweru', status: 'Imiterere', stock_value: 'Agaciro k\'ibintu',
      items: 'Ibintu', need_restock: 'Bikeneye kongererwa', add_item: 'Ongeraho ikintu',
      restock: 'Kongera', save: 'Bika', cancel: 'Kureka', amount: 'Umubare',
      category: 'Ubwoko', note: 'Icyongera', payment_method: 'Byishyurwe na',
      welcome_back: 'Murakaza neza', settings: 'Igenamiterere', appearance: 'Imiterere',
      language: 'Ururimi', currency: 'Amafaranga', theme: 'Imiterere', accent_color: 'Ibara nkuru',
      light: 'Umucyo', dark: 'Umwijima', profile: 'Umwirondoro'
    },
    fr: {
      nav_overview: 'Aperçu', nav_daily: 'Travail quotidien', nav_manage: 'Gestion', nav_general: 'Général',
      nav_dashboard: 'Tableau de bord', nav_new_sale: 'Nouvelle vente', nav_new_expense: 'Nouvelle dépense',
      nav_add_payment: 'Ajouter un paiement', nav_inventory: 'Stock', nav_customers: 'Clients',
      nav_ledger: 'Journal de caisse', nav_expenses: 'Dépenses', nav_notifications: 'Notifications',
      nav_boxes: 'Coffres d\'argent', nav_settings: 'Paramètres', nav_profile: 'Mon profil',
      sign_out: 'Déconnexion', sign_in: 'Connexion', sign_up: 'S\'inscrire',
      quick_actions: 'Actions rapides', recent_activity: 'Activité récente', low_stock: 'Stock faible',
      where_money: 'Où est mon argent ?', cash_box: 'Caisse', bank_box: 'Coffre banque',
      momo_box: 'Coffre MoMo', credit_box: 'Coffre crédit', total_money: 'Total',
      view_boxes: 'Voir les coffres', closing_balance: 'Solde de clôture', opening: 'Ouverture',
      today_sales: 'Ventes du jour', expenses: 'Dépenses', all_items: 'Tous les articles',
      item: 'Article', price: 'Prix', in_stock: 'En stock', sold_week: 'Vendus cette semaine',
      status: 'Statut', stock_value: 'Valeur du stock', items: 'Articles', need_restock: 'À réapprovisionner',
      add_item: 'Ajouter un article', restock: 'Réapprovisionner', save: 'Enregistrer', cancel: 'Annuler',
      amount: 'Montant', category: 'Catégorie', note: 'Note', payment_method: 'Payé depuis',
      welcome_back: 'Bon retour', settings: 'Paramètres', appearance: 'Apparence',
      language: 'Langue', currency: 'Devise', theme: 'Thème', accent_color: 'Couleur d\'accent',
      light: 'Clair', dark: 'Sombre', profile: 'Profil'
    },
    sw: {
      nav_overview: 'Muhtasari', nav_daily: 'Kazi ya kila siku', nav_manage: 'Usimamizi', nav_general: 'Kwa ujumla',
      nav_dashboard: 'Dashibodi', nav_new_sale: 'Mauzo mapya', nav_new_expense: 'Matumizi mapya',
      nav_add_payment: 'Ongeza malipo', nav_inventory: 'Bidhaa', nav_customers: 'Wateja',
      nav_ledger: 'Daftari la pesa', nav_expenses: 'Matumizi', nav_notifications: 'Arifa',
      nav_boxes: 'Masanduku ya pesa', nav_settings: 'Mipangilio', nav_profile: 'Wasifu wangu',
      sign_out: 'Toka', sign_in: 'Ingia', sign_up: 'Jiandikishe',
      quick_actions: 'Vitendo vya haraka', recent_activity: 'Shughuli za hivi pumbazoni', low_stock: 'Bidhaa chache',
      where_money: 'Pesa yangu iko wapi?', cash_box: 'Sanduku la pesa taslimu',
      bank_box: 'Sanduku la benki', momo_box: 'Sanduku la MoMo', credit_box: 'Sanduku la mkopo',
      total_money: 'Jumla ya pesa', view_boxes: 'Ona masanduku', closing_balance: 'Salio la mwisho',
      opening: 'Mwanzo', today_sales: 'Mauzo ya leo', expenses: 'Matumizi', all_items: 'Bidhaa zote',
      item: 'Kipengee', price: 'Bei', in_stock: 'Zilizopo', sold_week: 'Zilizouzwa wiki hii',
      status: 'Hali', stock_value: 'Thamani ya bidhaa', items: 'Bidhaa', need_restock: 'Zinahitaji kuongezwa',
      add_item: 'Ongeza bidhaa', restock: 'Ongeza', save: 'Hifadhi', cancel: 'Ghairi',
      amount: 'Kiasi', category: 'Aina', note: 'Maelezo', payment_method: 'Ililipwa kutoka',
      welcome_back: 'Karibu tena', settings: 'Mipangilio', appearance: 'Muonekano',
      language: 'Lugha', currency: 'Sarafu', theme: 'Mandhari', accent_color: 'Rangi kuu',
      light: 'Mwanga', dark: 'Giza', profile: 'Wasifu'
    }
  };

  var lang = 'en';

  function setLang(code) {
    if (DICTS[code]) lang = code;
  }

  function t(key) {
    var d = DICTS[lang] || DICTS.en;
    return d[key] || DICTS.en[key] || key;
  }

  return {
    t: t,
    setLang: setLang,
    lang: function () { return lang; },
    languages: [
      ['en', 'English'],
      ['rw', 'Kinyarwanda'],
      ['fr', 'Français'],
      ['sw', 'Kiswahili']
    ]
  };
})();
