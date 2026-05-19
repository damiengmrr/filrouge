const { query } = require('../db');

async function listFavorites(userId) {
  const result = await query(
    `
    SELECT f.id,
           p.id AS property_id,
           p.title,
           p.city,
           p.price,
           p.type,
           p.status,
           (
             SELECT image_url
             FROM property_images pi
             WHERE pi.property_id = p.id
             ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC
             LIMIT 1
           ) AS main_image_url
    FROM favorites f
    JOIN properties p ON p.id = f.property_id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `,
    [userId]
  );
  return result.rows;
}

async function addFavorite(userId, propertyId) {
  try {
    const result = await query(
      `
      INSERT INTO favorites (user_id, property_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, property_id) DO NOTHING
      RETURNING *
    `,
      [userId, propertyId]
    );
    return result.rows[0] || null;
  } catch (err) {
    throw err;
  }
}

async function removeFavorite(userId, propertyId) {
  await query('DELETE FROM favorites WHERE user_id = $1 AND property_id = $2', [
    userId,
    propertyId,
  ]);
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
