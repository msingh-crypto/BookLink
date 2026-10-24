const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");

const sessionModel = require("../models/sessionModel");

const {
  COOKIE_NAME,
  SESSION_DURATION_MS,
  newToken,
  hashToken,
  encryptToken,
  cookieOptions,
  clearCookieOptions,
} = require("../config/session");

async function register(req, res) {
  try {
    const { email, password, first_name: firstName } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Validate Lakehead domain requirement (US-01 / FR-01)
    if (!cleanEmail.endsWith("@lakeheadu.ca")) {
      return res.status(400).json({
        error: "Registration requires an official @lakeheadu.ca email address.",
      });
    }

    // 3. Validate first name (shown in the navbar greeting)
    const cleanFirstName =
      typeof firstName === "string" ? firstName.trim() : "";

    if (!cleanFirstName) {
      return res.status(400).json({
        error: "First name is required.",
      });
    }

    if (cleanFirstName.length > 50) {
      return res.status(400).json({
        error: "First name must be 50 characters or fewer.",
      });
    }

    // 4. Check for existing user (duplicate registration check)
    const existingUser = await userModel.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email address already exists.",
      });
    }

    // 5. Hash the password cryptographically (NFR-02)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Store user and their first name in the database
    const newUser = await userModel.createUser(
      cleanEmail,
      passwordHash,
      cleanFirstName,
    );

    return res.status(201).json({
      message: "Student account registered successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        first_name: newUser.first_name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal server error during registration.",
    });
  }
}

// US-02: User Login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    // 1. Validate required fields
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    // 2. Find the registered user
    const cleanEmail = email.toLowerCase().trim();
    const user = await userModel.findUserByEmail(cleanEmail);

    // 3. Verify the password
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    // 4. Check whether the account is active
    if (user.status !== "active") {
      return res.status(403).json({
        error: "Account is not active.",
      });
    }

    // 5. Generate a secure session token
    const token = newToken();

    // 6. Encrypt the token
    const encryptedToken = encryptToken(token);

    // 7. Calculate the session expiration time
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // 8. Save the session in PostgreSQL
    await sessionModel.createSession(hashToken(token), user.id, expiresAt);

    // 9. Send the encrypted session cookie to the browser
    res.cookie(COOKIE_NAME, encryptedToken, cookieOptions());

    // 10. Return successful login response
    return res.status(200).json({
      message: "Logged in successfully.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Internal server error during login.",
    });
  }
}

// US-02: User Logout
async function logout(req, res) {
  try {
    // 1. Delete the user's session from PostgreSQL
    await sessionModel.deleteSession(req.sessionTokenHash);

    // 2. Clear the session cookie from the browser
    res.clearCookie(COOKIE_NAME, clearCookieOptions());

    // 3. Return successful logout response
    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      error: "Internal server error during logout.",
    });
  }
}

module.exports = {
  register,
  login,
  logout,
};
