/* ============================================================
   BizTrack Lite — server configuration

   Defaults match a stock XAMPP MySQL install (user "root",
   empty password, port 3306). Override any of these with
   environment variables without touching code:

     set DB_USER=root & set DB_PASSWORD=secret & npm start
   ============================================================ */

module.exports = {
  /* MySQL connection (XAMPP defaults) */
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biztrack'
  },

  /* Session signing/peppering secret (regenerate for production!) */
  sessionSecret: process.env.SESSION_SECRET ||
    'c5fb32da622b38dfce1b4431d301e39718765b95d3bb3aafb2b3319b2f48608d',

  /* Web server */
  port: Number(process.env.PORT || 3000)
};
