const pool = require("../config/db");

// Find a user by their Lakehead email, with their first name from user_profiles
async function findUserByEmail(email) {
  const query = `
    SELECT u.*, p.first_name
    FROM users AS u
    LEFT JOIN user_profiles AS p ON p.email = u.email
    WHERE u.email = $1
  `;
  const result = await pool.query(query, [email.toLowerCase().trim()]);
  return result.rows[0];
}

// Create a new student user and their profile in one atomic statement
async function createUser(email, passwordHash, firstName) {
  const query = `
    WITH new_user AS (
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, role, status, created_at
    ),
    new_profile AS (
      INSERT INTO user_profiles (email, first_name)
      SELECT email, $3 FROM new_user
      RETURNING first_name
    )
    SELECT new_user.*, new_profile.first_name
    FROM new_user, new_profile
  `;
  const values = [email.toLowerCase().trim(), passwordHash, firstName];
  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  findUserByEmail,
  createUser,
};
