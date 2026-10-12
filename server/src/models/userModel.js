const pool = require("../config/db");

// Find a user by their Lakehead email
async function findUserByEmail(email) {
  const query = "SELECT * FROM users WHERE email = $1";
  const result = await pool.query(query, [email.toLowerCase().trim()]);
  return result.rows[0];
}

// Create a new student user in the database
async function createUser(email, passwordHash) {
  const query = `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, role, status, created_at
  `;
  const values = [email.toLowerCase().trim(), passwordHash];
  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  findUserByEmail,
  createUser,
};
