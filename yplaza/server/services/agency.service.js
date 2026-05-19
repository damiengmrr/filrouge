const { query } = require('../db');

async function getAllAgencies() {
  const result = await query(
    `
    SELECT a.*,
           COUNT(p.id)::int AS properties_count
    FROM agencies a
    LEFT JOIN properties p ON p.agency_id = a.id
    GROUP BY a.id
    ORDER BY a.name ASC
    `
  );
  return result.rows;
}

async function createAgency(data) {
  const { name, city, email = null, phone = null, address = null } = data;
  const result = await query(
    `
    INSERT INTO agencies (name, city, email, phone, address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [name, city, email || null, phone || null, address || null]
  );
  return result.rows[0];
}

async function updateAgency(id, data) {
  const { name, city, email = null, phone = null, address = null } = data;
  const result = await query(
    `
    UPDATE agencies
    SET name = $1, city = $2, email = $3, phone = $4, address = $5
    WHERE id = $6
    RETURNING *
    `,
    [name, city, email || null, phone || null, address || null, id]
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
