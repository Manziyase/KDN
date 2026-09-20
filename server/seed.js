/* ============================================================
   BizTrack Lite — database seeder

   Runs server/schema.sql against the configured MySQL server
   (creates the biztrack database, tables and demo data), then
   ensures the demo account exists:

     email:    demo@biztrack.app
     password: demo1234

   Usage:  npm run seed
   ============================================================ */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');

const schemaPath = path.join(__dirname, 'schema.sql');

async function seed() {
  /* Connect WITHOUT selecting a database first — the schema file
     creates it (CREATE DATABASE IF NOT EXISTS biztrack). */
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
    dateStrings: true
  });
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await conn.query(sql);
  await conn.end();

  /* Demo account — created if missing, password reset on reseed */
  const hash = auth.hashPassword('demo1234');
  await db.query(
    'INSERT INTO users (name, email, password_hash, role, shop_name) ' +
    'VALUES (?, ?, ?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)',
    ['Demo Owner', 'demo@biztrack.app', hash, 'owner', 'KDN Shop']
  );

  console.log('✔ Database "%s" created/refreshed with demo data', config.db.database);
  console.log('✔ Demo account ready → demo@biztrack.app / demo1234');
}

/* Run directly: node server/seed.js */
if (require.main === module) {
  seed()
    .then(function () { process.exit(0); })
    .catch(function (err) {
      console.error('\n✖ Seeding failed:', err.message);
      console.error('  Is MySQL running (XAMPP Control Panel → MySQL)?');
      console.error('  Connection settings: server/config.js  (host %s:%s, user "%s")',
        config.db.host, config.db.port, config.db.user);
      process.exit(1);
    });
}

module.exports = { seed };
