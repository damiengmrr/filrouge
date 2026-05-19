const { query } = require('../db');

async function getOverviewStats() {
  const [
    totalPropertiesResult,
    statusCountsResult,
    totalAgenciesResult,
    totalUsersResult,
    avgPriceByCityResult,
    mostViewedResult,
    countByTypeResult,
    perCityResult,
    recentPropertiesResult,
  ] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM properties'),
    query('SELECT status, COUNT(*)::int AS count FROM properties GROUP BY status'),
    query('SELECT COUNT(*) AS total FROM agencies'),
    query('SELECT COUNT(*) AS total FROM users WHERE is_active = TRUE'),
    query(
      `
      SELECT city, AVG(price) AS avg_price, COUNT(*) AS count
      FROM properties
      GROUP BY city
      ORDER BY avg_price DESC
      LIMIT 5
      `
    ),
    query(
      `
      SELECT id, title, city, views_count
      FROM properties
      ORDER BY views_count DESC
      LIMIT 5
      `
    ),
    query(
      `
      SELECT type, COUNT(*) AS count
      FROM properties
      GROUP BY type
      `
    ),
    query(
      `
      SELECT city, COUNT(*) AS count, AVG(price) AS avg_price
      FROM properties
      GROUP BY city
      `
    ),
    query(
      `
      SELECT p.id, p.title, p.city, p.price, p.status, p.created_at, a.name AS agency_name
      FROM properties p
      JOIN agencies a ON a.id = p.agency_id
      ORDER BY p.created_at DESC
      LIMIT 6
      `
    ),
  ]);

  const statusCounts = statusCountsResult.rows.reduce((acc, row) => {
    acc[row.status] = Number(row.count) || 0;
    return acc;
  }, {});

  const avg_price_by_city = avgPriceByCityResult.rows.map((r) => ({
    city: r.city,
    avg_price: Number(r.avg_price),
    count: Number(r.count),
  }));
  const properties_count_by_type = countByTypeResult.rows.map((r) => ({
    type: r.type,
    count: Number(r.count),
  }));

  const trend_score_by_city = perCityResult.rows.map((r) => {
    const count = Number(r.count);
    const avgPrice = Number(r.avg_price);
    const score = Math.round(count * (avgPrice / 100000));
    return {
      city: r.city,
      count,
      avg_price: avgPrice,
      score,
    };
  });

  return {
    total_properties: Number(totalPropertiesResult.rows[0].total) || 0,
    published_properties: statusCounts.published || 0,
    sold_properties: statusCounts.sold || 0,
    draft_properties: statusCounts.draft || 0,
    archived_properties: statusCounts.archived || 0,
    total_agencies: Number(totalAgenciesResult.rows[0].total) || 0,
    total_users: Number(totalUsersResult.rows[0].total) || 0,
    avg_price_by_city,
    most_viewed_properties: mostViewedResult.rows,
    properties_count_by_type,
    trend_score_by_city,
    latest_properties: recentPropertiesResult.rows,
  };
}

module.exports = {
  getOverviewStats,
};
