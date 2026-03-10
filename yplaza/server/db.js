const { readFileSync } = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');

const pool = config.db.connectionString
  ? new Pool({ connectionString: config.db.connectionString })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    });

async function query(text, params) {
  return pool.query(text, params);
}

async function initDb() {
  // Vérifie si la table users existe déjà
  const result = await query("SELECT to_regclass('public.users') as exists");
  if (result.rows[0].exists) {
    return;
  }

  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  const seedPath = path.join(__dirname, 'sql', 'seed.sql');

  const schemaSql = readFileSync(schemaPath, 'utf-8');
  const seedSql = readFileSync(seedPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query(seedSql);
    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log('Base de données initialisée (schema + seed).');
  } catch (err) {
    await client.query('ROLLBACK');
    // eslint-disable-next-line no-console
    console.error('Erreur lors de l’initialisation de la base de données:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  initDb,
  pool,
};

