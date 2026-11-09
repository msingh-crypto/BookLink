const { pool } = require("../config/db");

const getRangeConfig = (range) => {
  switch (range) {
    case "weekly":
      return {
        interval: "12 weeks",
        truncUnit: "week",
        stepInterval: "1 week",
      };
    case "semester":
      return {
        interval: "12 months",
        truncUnit: "month",
        stepInterval: "4 months",
      };
    case "monthly":
    default:
      return {
        interval: "12 months",
        truncUnit: "month",
        stepInterval: "1 month",
      };
  }
};

const getMetricTotals = async (range = "monthly") => {
  const { interval } = getRangeConfig(range);

  const queryText = `
    SELECT
      (SELECT COUNT(*)::INT FROM users WHERE created_at >= NOW() - INTERVAL '${interval}') AS total_registered_users,
      (SELECT COUNT(*)::INT FROM listings WHERE status = 'active') AS total_active_listings,
      (SELECT COUNT(*)::INT FROM listings WHERE status = 'sold' AND updated_at >= NOW() - INTERVAL '${interval}') AS total_items_sold;
  `;

  const { rows } = await pool.query(queryText);
  return rows[0];
};

const getTimeSeriesMetrics = async (range = "monthly") => {
  const { interval, truncUnit, stepInterval } = getRangeConfig(range);

  const queryText = `
    WITH date_series AS (
      SELECT DATE_TRUNC('${truncUnit}', time_bucket) AS period
      FROM generate_series(
        DATE_TRUNC('${truncUnit}', NOW() - INTERVAL '${interval}'),
        DATE_TRUNC('${truncUnit}', NOW()),
        INTERVAL '${stepInterval}'
      ) AS time_bucket
    )
    SELECT
      ds.period,
      COALESCE(COUNT(DISTINCT u.id), 0)::INT AS new_users,
      COALESCE(COUNT(DISTINCT l_active.id), 0)::INT AS active_listings,
      COALESCE(COUNT(DISTINCT l_sold.id), 0)::INT AS items_sold
    FROM date_series ds
    LEFT JOIN users u 
      ON u.created_at >= ds.period 
      AND u.created_at < ds.period + INTERVAL '${stepInterval}'
    LEFT JOIN listings l_active 
      ON l_active.created_at >= ds.period 
      AND l_active.created_at < ds.period + INTERVAL '${stepInterval}'
      AND l_active.status = 'active'
    LEFT JOIN listings l_sold 
      ON l_sold.updated_at >= ds.period 
      AND l_sold.updated_at < ds.period + INTERVAL '${stepInterval}'
      AND l_sold.status = 'sold'
    GROUP BY ds.period
    ORDER BY ds.period ASC;
  `;

  const { rows } = await pool.query(queryText);
  return rows;
};

module.exports = {
  getMetricTotals,
  getTimeSeriesMetrics,
};
