const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const config = require('../config');

const SALT_ROUNDS = 10;
const VALID_ROLES = ['client', 'agent', 'agency', 'admin'];

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    agency_id: row.agency_id,
    agency_name: row.agency_name,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

function assertValidRole(role) {
  if (!VALID_ROLES.includes(role)) {
    const err = new Error('Rôle invalide.');
    err.statusCode = 400;
    throw err;
  }
}

async function registerClient({ name, email, password }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('Un utilisateur avec cet email existe déjà.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, email, passwordHash, 'client']
  );

  return mapUser(result.rows[0]);
}

async function login({ email, password }) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const userRow = result.rows[0];
  if (!userRow) {
    const err = new Error('Identifiants invalides.');
    err.statusCode = 401;
    throw err;
  }

  if (userRow.is_active === false) {
    const err = new Error('Ce compte est désactivé.');
    err.statusCode = 403;
    throw err;
  }

  const match = await bcrypt.compare(password, userRow.password_hash);
  if (!match) {
    const err = new Error('Identifiants invalides.');
    err.statusCode = 401;
    throw err;
  }

  return mapUser(userRow);
}

function generateUserToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    agency_id: user.agency_id || null,
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

async function listUsers() {
  const result = await query(
    `
    SELECT u.id, u.name, u.email, u.role, u.agency_id, u.is_active, u.created_at,
           a.name AS agency_name
    FROM users u
    LEFT JOIN agencies a ON a.id = u.agency_id
    ORDER BY u.created_at DESC
    `
  );
  return result.rows.map(mapUser);
}

async function createUser({ name, email, password, role = 'client', agency_id = null }) {
  if (!name || !email || !password) {
    const err = new Error('Nom, email et mot de passe sont requis.');
    err.statusCode = 400;
    throw err;
  }
  assertValidRole(role);

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('Un utilisateur avec cet email existe déjà.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `
    INSERT INTO users (name, email, password_hash, role, agency_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, agency_id, is_active, created_at
    `,
    [name, email, passwordHash, role, agency_id || null]
  );

  return mapUser(result.rows[0]);
}

async function updateUser(id, data) {
  const { name, email, role, agency_id, is_active, password } = data;
  if (role) assertValidRole(role);

  const current = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }

  let passwordHash = current.rows[0].password_hash;
  if (password) {
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const nextAgencyId =
    agency_id === '' || agency_id === undefined ? null : Number(agency_id);

  const result = await query(
    `
    UPDATE users
    SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      role = COALESCE($3, role),
      agency_id = $4,
      is_active = COALESCE($5, is_active),
      password_hash = $6
    WHERE id = $7
    RETURNING id, name, email, role, agency_id, is_active, created_at
    `,
    [
      name || null,
      email || null,
      role || null,
      nextAgencyId,
      typeof is_active === 'boolean' ? is_active : null,
      passwordHash,
      id,
    ]
  );

  return mapUser(result.rows[0]);
}

async function changeUserRole(id, role) {
  assertValidRole(role);
  const result = await query(
    `
    UPDATE users
    SET role = $1
    WHERE id = $2
    RETURNING id, name, email, role, agency_id, is_active, created_at
    `,
    [role, id]
  );
  if (result.rows.length === 0) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  return mapUser(result.rows[0]);
}

async function disableUser(id) {
  const result = await query(
    `
    UPDATE users
    SET is_active = FALSE
    WHERE id = $1
    RETURNING id, name, email, role, agency_id, is_active, created_at
    `,
    [id]
  );
  if (result.rows.length === 0) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  return mapUser(result.rows[0]);
}

module.exports = {
  registerClient,
  login,
  generateUserToken,
  listUsers,
  createUser,
  updateUser,
  changeUserRole,
  disableUser,
};
