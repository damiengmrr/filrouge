const { query } = require('../db');

async function getAllAgencies() {
  const result = await query('SELECT * FROM agencies ORDER BY name ASC');
  return result.rows;
}

async function createAgency(data) {
  const { name, city } = data;
  const result = await query(
    'INSERT INTO agencies (name, city) VALUES ($1, $2) RETURNING *',
    [name, city]
  );
  return result.rows[0];
}

async function updateAgency(id, data) {
  const { name, city } = data;
  const result = await query(
    'UPDATE agencies SET name = $1, city = $2 WHERE id = $3 RETURNING *',
    [name, city, id]
  );
  if (result.rows.length === 0) {
    const err = new Error("Agence introuvable.");
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
}

async function deleteAgency(id) {
  const result = await query('DELETE FROM agencies WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    const err = new Error("Agence introuvable.");
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  getAllAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
};

