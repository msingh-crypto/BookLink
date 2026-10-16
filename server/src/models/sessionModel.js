const pool = require("../config/db");

// Create a new session when a user logs in
async function createSession(tokenHash, userId, expiresAt) {
  await pool.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, userId, expiresAt],
  );
}

// Find a valid session and retrieve the associated user
async function findActiveSession(tokenHash) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.status
     FROM user_sessions AS s
     JOIN users AS u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.status = 'active'`,
    [tokenHash],
  );

  return result.rows[0];
}

// Delete a session when a user logs out
async function deleteSession(tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [
    tokenHash,
  ]);
}

module.exports = {
  createSession,
  findActiveSession,
  deleteSession,
};
