const { pool } = require("../config/db");

// Fetch moderation reports queue
const getModerationQueue = async () => {
  const queryText = `
    SELECT 
      r.id AS report_id,
      r.reason_category,
      r.description,
      r.status AS report_status,
      r.created_at,
      l.id AS listing_id,
      l.title AS listing_title,
      l.status AS listing_status,
      u.id AS reported_user_id,
      u.email AS reported_user_email,
      u.status AS user_status
    FROM reports r
    LEFT JOIN listings l ON r.reported_listing_id = l.id
    LEFT JOIN users u ON r.reported_user_id = u.id OR l.seller_id = u.id
    ORDER BY r.created_at DESC;
  `;
  const { rows } = await pool.query(queryText);
  return rows;
};

// Mark listing as removed and update report status
const removeListing = async (
  listingId,
  adminId,
  reason = "Policy Violation",
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update listing status to removed
    const listingRes = await client.query(
      `UPDATE listings SET status = 'removed' WHERE id = $1 RETURNING *;`,
      [listingId],
    );

    if (listingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2. Resolve related reports and log removal reason in description column
    await client.query(
      `UPDATE reports 
       SET status = 'action_taken', 
           description = COALESCE(description, '') || ' [Admin Action by ' || $1::text || ': ' || $2::text || ']'
       WHERE reported_listing_id = $3;`,
      [adminId, reason, listingId],
    );

    await client.query("COMMIT");
    return listingRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Suspend account and invalidate active sessions
const suspendUser = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Set user status to suspended
    const userRes = await client.query(
      `UPDATE users SET status = 'suspended' WHERE id = $1 RETURNING id, email, status, role;`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2. Revoke active sessions immediately
    await client.query(`DELETE FROM user_sessions WHERE user_id = $1;`, [
      userId,
    ]);

    await client.query("COMMIT");
    return userRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getModerationQueue,
  removeListing,
  suspendUser,
};
