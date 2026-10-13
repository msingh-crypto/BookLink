const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");

async function register(req, res) {
  try {
    const { email, password } = req.body;

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

    // 3. Check for existing user (duplicate registration check)
    const existingUser = await userModel.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email address already exists.",
      });
    }

    // 4. Hash the password cryptographically (NFR-02)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Store user in database
    const newUser = await userModel.createUser(cleanEmail, passwordHash);

    return res.status(201).json({
      message: "Student account registered successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal server error during registration.",
    });
  }
}

module.exports = {
  register,
};
