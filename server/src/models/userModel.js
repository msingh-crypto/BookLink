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

// Create a new, unverified student user and their profile in one atomic statement
async function createUser(
  email,
  passwordHash,
  firstName,
  verificationTokenHash,
  verificationExpiresAt,
) {
  const query = `
    WITH new_user AS (
      INSERT INTO users (
        email,
        password_hash,
        email_verification_token_hash,
        email_verification_expires_at
      )
      VALUES ($1, $2, $4, $5)
      RETURNING id, email, role, status, email_verified, created_at
    ),
    new_profile AS (
      INSERT INTO user_profiles (email, first_name)
      SELECT email, $3 FROM new_user
      RETURNING first_name
    )
    SELECT new_user.*, new_profile.first_name
    FROM new_user, new_profile
  `;
  const values = [
    email.toLowerCase().trim(),
    passwordHash,
    firstName,
    verificationTokenHash,
    verificationExpiresAt,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Delete a user (their profile cascades), used when the confirmation email can't be sent
async function deleteUser(id) {
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}

// Replace an unverified user's confirmation token, invalidating any older link
async function setVerificationToken(id, tokenHash, expiresAt) {
  await pool.query(
    `UPDATE users
     SET email_verification_token_hash = $2,
         email_verification_expires_at = $3,
         updated_at = NOW()
     WHERE id = $1 AND email_verified = FALSE`,
    [id, tokenHash, expiresAt],
  );
}

// Mark the account matching an unexpired confirmation token as verified
async function verifyEmail(tokenHash) {
  const result = await pool.query(
    `UPDATE users
     SET email_verified = TRUE,
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE email_verification_token_hash = $1
       AND email_verification_expires_at > NOW()
     RETURNING id, email`,
    [tokenHash],
  );
  return result.rows[0];
}

module.exports = {
  findUserByEmail,
  createUser,
  deleteUser,
  setVerificationToken,
  verifyEmail,
};
