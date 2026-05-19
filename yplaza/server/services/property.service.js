const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { pool, query } = require('../db');

const VALID_STATUSES = ['draft', 'published', 'sold', 'archived'];
const PUBLIC_STATUSES = ['published', 'sold'];
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'properties');
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function normalizeStatus(status) {
  if (!status) return undefined;
  const value = String(status)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const map = {
    available: 'published',
    brouillon: 'draft',
    draft: 'draft',
    publiee: 'published',
    published: 'published',
    vendue: 'sold',
    sold: 'sold',
    archivee: 'archived',
    archived: 'archived',
  };
  return map[value];
}

function assertValidStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized || !VALID_STATUSES.includes(normalized)) {
    const err = new Error('Status invalide.');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function mapPropertyRow(row) {
  if (!row) return null;
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    favorites_count: Number(row.favorites_count || 0),
    contacts_count: Number(row.contacts_count || 0),
    views_count: Number(row.views_count || 0),
  };
}

function buildPropertySelect(whereClause = '') {
  return `
    SELECT p.*,
           a.name AS agency_name,
           a.city AS agency_city,
           a.email AS agency_email,
           a.phone AS agency_phone,
           a.address AS agency_address,
           COALESCE(img.images, '[]'::json) AS images,
           img.main_image_url,
           COALESCE(fav.favorites_count, 0)::int AS favorites_count,
           COALESCE(contact_stats.contacts_count, 0)::int AS contacts_count
    FROM properties p
    JOIN agencies a ON a.id = p.agency_id
    LEFT JOIN LATERAL (
      SELECT
        json_agg(
          json_build_object(
            'id', pi.id,
            'property_id', pi.property_id,
            'image_url', pi.image_url,
            'is_main', pi.is_main,
            'sort_order', pi.sort_order,
            'created_at', pi.created_at
          )
          ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC
        ) AS images,
        (array_agg(pi.image_url ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC))[1] AS main_image_url
      FROM property_images pi
      WHERE pi.property_id = p.id
    ) img ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS favorites_count
      FROM favorites f
      WHERE f.property_id = p.id
    ) fav ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS contacts_count
      FROM contacts c
      WHERE c.property_id = p.id
    ) contact_stats ON TRUE
    ${whereClause}
  `;
}

function canModifyProperty(row, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!['agent', 'agency'].includes(user.role)) return false;
  if (Number(row.created_by) === Number(user.id)) return true;
  return !!user.agency_id && Number(row.agency_id) === Number(user.agency_id);
}

function canViewProperty(row, user) {
  if (PUBLIC_STATUSES.includes(row.status)) return true;
  return canModifyProperty(row, user);
}

function buildListQuery(filters, pagination, sorting) {
  const where = [];
  const params = [];
  let idx = 1;

  if (filters.city) {
    where.push(`p.city ILIKE $${idx++}`);
    params.push(`%${filters.city}%`);
  }
  if (filters.minPrice) {
    where.push(`p.price >= $${idx++}`);
    params.push(Number(filters.minPrice));
  }
  if (filters.maxPrice) {
    where.push(`p.price <= $${idx++}`);
    params.push(Number(filters.maxPrice));
  }
  if (filters.type) {
    where.push(`p.type = $${idx++}`);
    params.push(filters.type);
  }
  if (filters.status) {
    const status = assertValidStatus(filters.status);
    where.push(`p.status = $${idx++}`);
    params.push(status);
    if (filters.publicOnly && !PUBLIC_STATUSES.includes(status)) {
      where.push('1 = 0');
    }
  } else if (filters.publicOnly) {
    where.push(`p.status = ANY($${idx++})`);
    params.push(PUBLIC_STATUSES);
  }
  if (filters.agencyId) {
    where.push(`p.agency_id = $${idx++}`);
    params.push(Number(filters.agencyId));
  }
  if (filters.createdBy === 'me' && filters.userId) {
    if (filters.userAgencyId) {
      where.push(`(p.created_by = $${idx++} OR p.agency_id = $${idx++})`);
      params.push(Number(filters.userId), Number(filters.userAgencyId));
    } else {
      where.push(`p.created_by = $${idx++}`);
      params.push(Number(filters.userId));
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Number(pagination.page) > 0 ? Number(pagination.page) : 1;
  const limit = Number(pagination.limit) > 0 ? Number(pagination.limit) : 10;
  const offset = (page - 1) * limit;

  let orderBy = 'p.created_at DESC';
  if (sorting.sort === 'price_asc') orderBy = 'p.price ASC';
  if (sorting.sort === 'price_desc') orderBy = 'p.price DESC';
  if (sorting.sort === 'views_desc') orderBy = 'p.views_count DESC';

  const countParams = [...params];
  const countQuery = `SELECT COUNT(*) FROM properties p ${whereClause}`;
  const dataQuery = `
    ${buildPropertySelect(whereClause)}
    ORDER BY ${orderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  return { countQuery, dataQuery, params, countParams, page, limit };
}

async function listProperties(filters = {}, pagination = {}, sorting = {}) {
  const { countQuery, dataQuery, params, countParams, page, limit } = buildListQuery(
    filters,
    pagination,
    sorting
  );

  const [countResult, dataResult] = await Promise.all([
    query(countQuery, countParams),
    query(dataQuery, params),
  ]);

  const total = Number(countResult.rows[0].count) || 0;
  return {
    data: dataResult.rows.map(mapPropertyRow),
    total,
    page,
    limit,
  };
}

async function getPropertyRecord(id) {
  const result = await query(`${buildPropertySelect('WHERE p.id = $1')}`, [id]);
  return mapPropertyRow(result.rows[0]);
}

async function getPropertyById(id, user = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`${buildPropertySelect('WHERE p.id = $1')}`, [id]);
    const property = mapPropertyRow(result.rows[0]);
    if (!property || !canViewProperty(property, user)) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('UPDATE properties SET views_count = views_count + 1 WHERE id = $1', [
      id,
    ]);
    await client.query('COMMIT');
    property.views_count += 1;
    return property;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function resolveAgencyId(data, user) {
  const agencyId = data.agency_id || user.agency_id;
  if (!agencyId) {
    const err = new Error('Une agence doit être associée au bien.');
    err.statusCode = 400;
    throw err;
  }
  if (user.role !== 'admin' && user.agency_id && Number(agencyId) !== Number(user.agency_id)) {
    const err = new Error('Vous ne pouvez publier que pour votre agence.');
    err.statusCode = 403;
    throw err;
  }
  return Number(agencyId);
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
  } = data;

  const status = normalizeStatus(data.status) || 'draft';
  const agencyId = resolveAgencyId(data, user);

  const result = await query(
    `
    INSERT INTO properties
      (title, description, price, city, surface, rooms, type, status, agency_id, created_by)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
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

  return getPropertyRecord(result.rows[0].id);
}

async function assertCanModifyProperty(propertyId, user) {
  const result = await query(
    'SELECT id, created_by, agency_id, status FROM properties WHERE id = $1',
    [propertyId]
  );
  const row = result.rows[0];
  if (!row) {
    const err = new Error('Bien introuvable.');
    err.statusCode = 404;
    throw err;
  }
  if (!canModifyProperty(row, user)) {
    const err = new Error('Vous ne pouvez modifier que les biens de votre agence.');
    err.statusCode = 403;
    throw err;
  }
  return row;
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
  } = data;

  const status = data.status ? assertValidStatus(data.status) : 'draft';
  const agencyId = resolveAgencyId(data, user);

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
    RETURNING id
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
      id,
    ]
  );

  return getPropertyRecord(result.rows[0].id);
}

async function deleteProperty(id, user) {
  await assertCanModifyProperty(id, user);
  const images = await query('SELECT image_url FROM property_images WHERE property_id = $1', [id]);
  await query('DELETE FROM properties WHERE id = $1', [id]);
  await Promise.all(images.rows.map((img) => removeLocalUpload(img.image_url)));
}

async function updatePropertyStatus(id, status, user) {
  await assertCanModifyProperty(id, user);
  const normalized = assertValidStatus(status);
  const result = await query(
    'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
    [normalized, id]
  );
  return getPropertyRecord(result.rows[0].id);
}

async function saveUploadedImage(propertyId, file, sortOrder, isMain) {
  const ext = MIME_EXTENSIONS[file.mimeType];
  if (!ext) {
    const err = new Error('Format image non supporté.');
    err.statusCode = 400;
    throw err;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${propertyId}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, file.buffer);

  return {
    imageUrl: `/uploads/properties/${filename}`,
    sortOrder,
    isMain,
  };
}

async function addPropertyImages(propertyId, files, user) {
  await assertCanModifyProperty(propertyId, user);
  if (!files.length) {
    const err = new Error('Aucune image reçue.');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  const savedFiles = [];
  try {
    await client.query('BEGIN');
    const meta = await client.query(
      `
      SELECT
        COUNT(*)::int AS count,
        COALESCE(MAX(sort_order), -1)::int AS max_order,
        BOOL_OR(is_main) AS has_main
      FROM property_images
      WHERE property_id = $1
      `,
      [propertyId]
    );
    const count = Number(meta.rows[0].count || 0);
    const maxOrder = Number(meta.rows[0].max_order || -1);
    const hasMain = Boolean(meta.rows[0].has_main);

    for (let index = 0; index < files.length; index += 1) {
      const saved = await saveUploadedImage(
        propertyId,
        files[index],
        maxOrder + index + 1,
        !hasMain && index === 0
      );
      savedFiles.push(saved.imageUrl);
      await client.query(
        `
        INSERT INTO property_images (property_id, image_url, is_main, sort_order)
        VALUES ($1, $2, $3, $4)
        `,
        [propertyId, saved.imageUrl, saved.isMain, saved.sortOrder]
      );
    }

    await client.query('COMMIT');
    return getPropertyRecord(propertyId);
  } catch (err) {
    await client.query('ROLLBACK');
    await Promise.all(savedFiles.map((url) => removeLocalUpload(url)));
    throw err;
  } finally {
    client.release();
  }
}

async function removeLocalUpload(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/properties/')) return;
  const filename = path.basename(imageUrl);
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function deletePropertyImage(propertyId, imageId, user) {
  await assertCanModifyProperty(propertyId, user);
  const client = await pool.connect();
  let deletedImageUrl = null;
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT * FROM property_images WHERE id = $1 AND property_id = $2',
      [imageId, propertyId]
    );
    const image = current.rows[0];
    if (!image) {
      const err = new Error('Image introuvable.');
      err.statusCode = 404;
      throw err;
    }

    deletedImageUrl = image.image_url;
    await client.query('DELETE FROM property_images WHERE id = $1', [imageId]);

    if (image.is_main) {
      const nextImage = await client.query(
        `
        SELECT id
        FROM property_images
        WHERE property_id = $1
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
        `,
        [propertyId]
      );
      if (nextImage.rows[0]) {
        await client.query('UPDATE property_images SET is_main = TRUE WHERE id = $1', [
          nextImage.rows[0].id,
        ]);
      }
    }

    await client.query('COMMIT');
    await removeLocalUpload(deletedImageUrl);
    return getPropertyRecord(propertyId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setMainPropertyImage(propertyId, imageId, user) {
  await assertCanModifyProperty(propertyId, user);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT id FROM property_images WHERE id = $1 AND property_id = $2',
      [imageId, propertyId]
    );
    if (!current.rows[0]) {
      const err = new Error('Image introuvable.');
      err.statusCode = 404;
      throw err;
    }
    await client.query('UPDATE property_images SET is_main = FALSE WHERE property_id = $1', [
      propertyId,
    ]);
    await client.query('UPDATE property_images SET is_main = TRUE WHERE id = $1', [imageId]);
    await client.query('COMMIT');
    return getPropertyRecord(propertyId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createContact(propertyId, data, user) {
  const property = await getPropertyRecord(propertyId);
  if (!property || !PUBLIC_STATUSES.includes(property.status)) {
    const err = new Error('Bien introuvable.');
    err.statusCode = 404;
    throw err;
  }

  const name = data.name || user?.name;
  const email = data.email || user?.email;
  if (!name || !email) {
    const err = new Error('Nom et email sont requis pour contacter l’agence.');
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    `
    INSERT INTO contacts (property_id, user_id, name, email, message)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [propertyId, user?.id || null, name, email, data.message || '']
  );
  return result.rows[0];
}

module.exports = {
  VALID_STATUSES,
  PUBLIC_STATUSES,
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  addPropertyImages,
  deletePropertyImage,
  setMainPropertyImage,
  createContact,
};
