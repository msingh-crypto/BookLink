const crypto = require("node:crypto");

// Session configuration
const COOKIE_NAME = "booklink_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Get the encryption key from the .env file
function encryptionKey() {
  const key = process.env.SESSION_ENCRYPTION_KEY;

  if (!/^[a-f\d]{64}$/i.test(key || "")) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.",
    );
  }

  return Buffer.from(key, "hex");
}

// Generate a secure random session token
function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Hash a session token before storing it in PostgreSQL
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Encrypt the token before sending it to the browser
function encryptToken(token) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

// Decrypt and authenticate a token received from the browser
function decryptToken(value) {
  try {
    if (!value || value.length > 500) {
      return null;
    }

    const parts = value.split(".");

    if (parts.length !== 4 || parts[0] !== "v1") {
      return null;
    }

    const [, ivText, encryptedText, tagText] = parts;

    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");

    if (iv.length !== 12 || tag.length !== 16) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv,
    );

    decipher.setAuthTag(tag);

    const token = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]).toString("utf8");

    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

// Read the session cookie from an incoming HTTP request
function readSessionCookie(req) {
  const cookiePrefix = `${COOKIE_NAME}=`;
  const cookies = (req.headers.cookie || "").split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();

    if (trimmed.startsWith(cookiePrefix)) {
      return trimmed.slice(cookiePrefix.length);
    }
  }

  return null;
}

// Configure the browser's session cookie
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  };
}

// Cookie settings used during logout
function clearCookieOptions() {
  const options = cookieOptions();
  delete options.maxAge;
  return options;
}

module.exports = {
  COOKIE_NAME,
  SESSION_DURATION_MS,
  newToken,
  hashToken,
  encryptToken,
  decryptToken,
  readSessionCookie,
  cookieOptions,
  clearCookieOptions,
};
