const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const config = require('../config');

const SALT_ROUNDS = 10;

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
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
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

async function listUsers() {
  const result = await query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

async function changeUserRole(id, role) {
  if (!['client', 'agent', 'admin'].includes(role)) {
    const err = new Error('Rôle invalide.');
    err.statusCode = 400;
    throw err;
  }
  const result = await query(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at',
    [role, id]
  );
  if (result.rows.length === 0) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = {
  registerClient,
  login,
  generateUserToken,
  listUsers,
  changeUserRole,
};

