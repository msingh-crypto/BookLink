const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");

const sessionModel = require("../models/sessionModel");
const { sendVerificationEmail } = require("../config/mailer");

const {
  COOKIE_NAME,
  SESSION_DURATION_MS,
  newToken,
  hashToken,
  encryptToken,
  cookieOptions,
  clearCookieOptions,
} = require("../config/session");

// US-01: Confirmation links stay valid for 24 hours
const VERIFICATION_DURATION_MS = 24 * 60 * 60 * 1000;

// Build the link students click in their confirmation email
function verificationLink(token) {
  const serverUrl =
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${serverUrl}/api/auth/verify-email?token=${token}`;
}

// Where the browser lands after clicking the link, e.g. /?verified=success
function clientRedirect(result) {
  const clientUrl = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return `${clientUrl}/?verified=${result}`;
}

// Create a fresh confirmation token; only its hash is stored in PostgreSQL
function newVerificationToken() {
  const token = newToken();
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_DURATION_MS),
  };
}

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

    // 6. Store the unverified user, their first name and confirmation token
    const { token, tokenHash, expiresAt } = newVerificationToken();
    const newUser = await userModel.createUser(
      cleanEmail,
      passwordHash,
      cleanFirstName,
      tokenHash,
      expiresAt,
    );

    // 7. Email the confirmation link; undo the signup if it can't be sent
    try {
      await sendVerificationEmail(
        newUser.email,
        newUser.first_name,
        verificationLink(token),
      );
    } catch (mailError) {
      console.error("Verification email error:", mailError);
      await userModel.deleteUser(newUser.id);
      return res.status(502).json({
        error:
          "We couldn't send your confirmation email. Please try again later.",
      });
    }

    return res.status(201).json({
      message:
        "Account created! Check your Lakehead inbox and click the confirmation link before logging in.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        email_verified: newUser.email_verified,
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

    // 5. Require a confirmed email; send a fresh link so the student isn't stuck
    if (!user.email_verified) {
      const { token, tokenHash, expiresAt } = newVerificationToken();
      await userModel.setVerificationToken(user.id, tokenHash, expiresAt);

      try {
        await sendVerificationEmail(
          user.email,
          user.first_name,
          verificationLink(token),
        );
      } catch (mailError) {
        console.error("Verification email error:", mailError);
        return res.status(403).json({
          error: "Please confirm your email address before logging in.",
        });
      }

      return res.status(403).json({
        error:
          "Please confirm your email address before logging in. We've sent a new confirmation link to your inbox.",
      });
    }

    // 6. Generate a secure session token
    const token = newToken();

    // 7. Encrypt the token
    const encryptedToken = encryptToken(token);

    // 8. Calculate the session expiration time
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // 9. Save the session in PostgreSQL
    await sessionModel.createSession(hashToken(token), user.id, expiresAt);

    // 10. Send the encrypted session cookie to the browser
    res.cookie(COOKIE_NAME, encryptedToken, cookieOptions());

    // 11. Return successful login response
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

// US-01: Confirm a student's email from the link in their inbox
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;

    // 1. Reject anything that isn't a token we could have issued
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return res.redirect(clientRedirect("invalid"));
    }

    // 2. Mark the matching, unexpired account as verified
    const user = await userModel.verifyEmail(hashToken(token));

    // 3. Send the student back to the app with the result
    return res.redirect(clientRedirect(user ? "success" : "invalid"));
  } catch (error) {
    console.error("Email verification error:", error);
    return res.redirect(clientRedirect("error"));
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
  verifyEmail,
  logout,
};
