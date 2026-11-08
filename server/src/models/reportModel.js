const { pool } = require("../config/db");

const createReport = async ({
  reporterId,
  reportedListingId,
  reportedUserId,
  reasonCategory,
  description,
}) => {
  const queryText = `
    INSERT INTO reports (reporter_id, reported_listing_id, reported_user_id, reason_category, description)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, reporter_id, reported_listing_id, reported_user_id, reason_category, description, status, created_at;
  `;
  const values = [
    reporterId,
    reportedListingId || null,
    reportedUserId || null,
    reasonCategory,
    description || null,
  ];
  const { rows } = await pool.query(queryText, values);
  return rows[0];
};

module.exports = {
  createReport,
};
