const { query } = require('../db');

async function getOverviewStats() {
  const totalPropertiesPromise = query('SELECT COUNT(*) AS total FROM properties');
  const avgPriceByCityPromise = query(
    `
    SELECT city, AVG(price) AS avg_price, COUNT(*) AS count
    FROM properties
    GROUP BY city
    ORDER BY avg_price DESC
    LIMIT 5
  `
  );
  const mostViewedPromise = query(
    `
    SELECT id, title, city, views_count
    FROM properties
    ORDER BY views_count DESC
    LIMIT 5
  `
  );
  const countByTypePromise = query(
    `
    SELECT type, COUNT(*) AS count
    FROM properties
    GROUP BY type
  `
  );
  const perCityPromise = query(
    `
    SELECT city, COUNT(*) AS count, AVG(price) AS avg_price
    FROM properties
    GROUP BY city
  `
  );

  const [
    totalPropertiesResult,
    avgPriceByCityResult,
    mostViewedResult,
    countByTypeResult,
    perCityResult,
  ] = await Promise.all([
    totalPropertiesPromise,
    avgPriceByCityPromise,
    mostViewedPromise,
    countByTypePromise,
    perCityPromise,
  ]);

  const total_properties = Number(totalPropertiesResult.rows[0].total) || 0;
  const avg_price_by_city = avgPriceByCityResult.rows.map((r) => ({
    city: r.city,
    avg_price: Number(r.avg_price),
    count: Number(r.count),
  }));
  const most_viewed_properties = mostViewedResult.rows;
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
    total_properties,
    avg_price_by_city,
    most_viewed_properties,
    properties_count_by_type,
    trend_score_by_city,
  };
}

module.exports = {
  getOverviewStats,
};

