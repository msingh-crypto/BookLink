const sessionModel = require("../models/sessionModel");

const {
  readSessionCookie,
  decryptToken,
  hashToken,
} = require("../config/session");

// US-02: Authentication Guard
async function requireAuth(req, res, next) {
  // 1. Read the encrypted session cookie
  const encryptedToken = readSessionCookie(req);

  // 2. Decrypt the token
  const token = decryptToken(encryptedToken);

  // 3. Reject requests without a valid token
  if (!token) {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }

  try {
    // 4. Hash the decrypted token
    const tokenHash = hashToken(token);

    // 5. Check whether the session exists and is active
    const user = await sessionModel.findActiveSession(tokenHash);

    if (!user) {
      return res.status(401).json({
        error: "Session is invalid or expired.",
      });
    }

    // 6. Attach authenticated user information
    req.user = user;
    req.sessionTokenHash = tokenHash;

    // 7. Allow the request to continue
    return next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      error: "Internal server error during authentication.",
    });
  }
}

module.exports = requireAuth;
