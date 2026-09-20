/* ============================================================
   BizTrack Lite — database seeder

   Runs server/schema.sql against the configured MySQL server
   (creates the biztrack database, tables and demo data).

   Usage:  npm run seed
   ============================================================ */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');

const schemaPath = path.join(__dirname, 'schema.sql');

async function seed() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await db.pool.query(sql);
  console.log('✔ Database "%s" created/refreshed with demo data', config.db.database);
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
