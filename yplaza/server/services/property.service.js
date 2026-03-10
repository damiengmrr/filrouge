const { query } = require('../db');

function buildListQuery(filters, pagination, sorting) {
  const where = [];
  const params = [];
  let idx = 1;

  if (filters.city) {
    where.push(`city ILIKE $${idx++}`);
    params.push(`%${filters.city}%`);
  }
  if (filters.minPrice) {
    where.push(`price >= $${idx++}`);
    params.push(Number(filters.minPrice));
  }
  if (filters.maxPrice) {
    where.push(`price <= $${idx++}`);
    params.push(Number(filters.maxPrice));
  }
  if (filters.type) {
    where.push(`type = $${idx++}`);
    params.push(filters.type);
  }
  if (filters.status) {
    where.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.createdBy === 'me' && filters.userId) {
    where.push(`created_by = $${idx++}`);
    params.push(filters.userId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Number(pagination.page) > 0 ? Number(pagination.page) : 1;
  const limit = Number(pagination.limit) > 0 ? Number(pagination.limit) : 10;
  const offset = (page - 1) * limit;

  let orderBy = 'created_at DESC';
  if (sorting.sort === 'price_asc') orderBy = 'price ASC';
  if (sorting.sort === 'price_desc') orderBy = 'price DESC';
  if (sorting.sort === 'views_desc') orderBy = 'views_count DESC';

  const countQuery = `SELECT COUNT(*) FROM properties ${whereClause}`;
  const dataQuery = `
    SELECT p.*, a.name AS agency_name, a.city AS agency_city
    FROM properties p
    JOIN agencies a ON a.id = p.agency_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  return { countQuery, dataQuery, params, page, limit };
}

async function listProperties(filters = {}, pagination = {}, sorting = {}) {
  const { countQuery, dataQuery, params, page, limit } = buildListQuery(
    filters,
    pagination,
    sorting
  );

  const [countResult, dataResult] = await Promise.all([
    query(countQuery, params.slice(0, params.length - 2)),
    query(dataQuery, params),
  ]);

  const total = Number(countResult.rows[0].count) || 0;
  return {
    data: dataResult.rows,
    total,
    page,
    limit,
  };
}

async function getPropertyById(id) {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
      SELECT p.*, a.name AS agency_name, a.city AS agency_city
      FROM properties p
      JOIN agencies a ON a.id = p.agency_id
      WHERE p.id = $1
    `,
      [id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('UPDATE properties SET views_count = views_count + 1 WHERE id = $1', [
      id,
    ]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createProperty(data, user) {
  const {
    title,
    description,
    price,
    city,
    surface,
    rooms,
    type,
    status = 'available',
    agency_id,
  } = data;

  const agencyId = agency_id || null;

  const result = await query(
    `
    INSERT INTO properties
      (title, description, price, city, surface, rooms, type, status, agency_id, created_by)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,
    [
      title,
      description || '',
      Number(price),
      city,
      Number(surface),
      Number(rooms),
      type,
      status,
      agencyId,
      user.id,
    ]
  );

  return result.rows[0];
}

async function assertCanModifyProperty(propertyId, user) {
  const result = await query('SELECT created_by FROM properties WHERE id = $1', [propertyId]);
  const row = result.rows[0];
  if (!row) {
    const err = new Error('Bien introuvable.');
    err.statusCode = 404;
    throw err;
  }
  if (user.role !== 'admin' && row.created_by !== user.id) {
    const err = new Error('Vous ne pouvez modifier que vos propres biens.');
    err.statusCode = 403;
    throw err;
  }
}

async function updateProperty(id, data, user) {
  await assertCanModifyProperty(id, user);

  const {
    title,
    description,
    price,
    city,
    surface,
    rooms,
    type,
    status,
    agency_id,
  } = data;

  const result = await query(
    `
    UPDATE properties
    SET
      title = $1,
      description = $2,
      price = $3,
      city = $4,
      surface = $5,
      rooms = $6,
      type = $7,
      status = $8,
      agency_id = $9,
      updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `,
    [
      title,
      description || '',
      Number(price),
      city,
      Number(surface),
      Number(rooms),
      type,
      status,
      agency_id || null,
      id,
    ]
  );

  return result.rows[0];
}

async function deleteProperty(id, user) {
  await assertCanModifyProperty(id, user);
  await query('DELETE FROM properties WHERE id = $1', [id]);
}

async function updatePropertyStatus(id, status, user) {
  await assertCanModifyProperty(id, user);
  if (!['available', 'sold'].includes(status)) {
    const err = new Error('Status invalide.');
    err.statusCode = 400;
    throw err;
  }
  const result = await query(
    'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

module.exports = {
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
};

