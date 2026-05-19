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
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  const seedPath = path.join(__dirname, 'sql', 'seed.sql');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!result.rows[0].exists) {
      const schemaSql = readFileSync(schemaPath, 'utf-8');
      const seedSql = readFileSync(seedPath, 'utf-8');
      await client.query(schemaSql);
      await client.query(seedSql);
    }
    await runMigrations(client);
    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log('Base de données prête.');
  } catch (err) {
    await client.query('ROLLBACK');
    // eslint-disable-next-line no-console
    console.error('Erreur lors de l’initialisation de la base de données:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function runMigrations(client) {
  await client.query(`
    ALTER TABLE agencies
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT
  `);

  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);
  await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await client.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('client', 'agent', 'agency', 'admin'))
  `);
  await client.query(`
    UPDATE users
    SET agency_id = 1
    WHERE email = 'agent@yplaza.test'
      AND role IN ('agent', 'agency')
      AND agency_id IS NULL
      AND EXISTS (SELECT 1 FROM agencies WHERE id = 1)
  `);

  await client.query('ALTER TABLE properties ALTER COLUMN status DROP DEFAULT');
  await client.query('ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check');
  await client.query(`
    UPDATE properties
    SET status = CASE
      WHEN status = 'available' THEN 'published'
      WHEN status = 'vendue' THEN 'sold'
      WHEN status = 'publiee' THEN 'published'
      WHEN status = 'brouillon' THEN 'draft'
      WHEN status = 'archivee' THEN 'archived'
      ELSE status
    END
  `);
  await client.query(`
    ALTER TABLE properties
      ADD CONSTRAINT properties_status_check
      CHECK (status IN ('draft', 'published', 'sold', 'archived'))
  `);
  await client.query("ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'draft'");

  await client.query(`
    CREATE TABLE IF NOT EXISTS property_images (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_main BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS property_images_one_main
    ON property_images(property_id)
    WHERE is_main = TRUE
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_property_images_property_id
    ON property_images(property_id)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_contacts_property_id
    ON contacts(property_id)
  `);

  await client.query(`
    INSERT INTO property_images (property_id, image_url, is_main, sort_order)
    SELECT
      p.id,
      '/assets/properties/p' || (((p.id - 1) % 9) + 1)::text || '.jpg',
      TRUE,
      0
    FROM properties p
    WHERE NOT EXISTS (
      SELECT 1 FROM property_images pi WHERE pi.property_id = p.id
    )
  `);
}

module.exports = {
  query,
  initDb,
  pool,
};
