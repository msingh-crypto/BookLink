const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new student account
 *     description: Registers a student account using a verified @lakeheadu.ca email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@lakeheadu.ca
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *               first_name:
 *                 type: string
 *                 maxLength: 50
 *                 example: Nick
 *     responses:
 *       201:
 *         description: Account created; a confirmation link was emailed to the student.
 *       400:
 *         description: Validation failed (missing fields or invalid domain).
 *       409:
 *         description: Account already exists.
 *       500:
 *         description: Internal server error.
 *       502:
 *         description: The confirmation email could not be sent, so the account was not created.
 */
router.post("/auth/register", authController.register);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Confirm a student's email address
 *     description: Opened from the link in the confirmation email. Marks the account as verified and redirects to the client with ?verified=success, ?verified=invalid (bad or expired link) or ?verified=error.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to the client with the verification result.
 */
router.get("/auth/verify-email", authController.verifyEmail);

// US-02: User Login

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to an existing student account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@lakeheadu.ca
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is not active, or the email is not confirmed yet (a new confirmation link is emailed)
 *       500:
 *         description: Internal server error
 */

router.post("/auth/login", authController.login);

// US-02: User Logout
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the currently authenticated student
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Authentication required or session invalid
 *       500:
 *         description: Internal server error
 */
router.post("/auth/logout", requireAuth, authController.logout);

// US-02: Get the currently authenticated student
router.get("/auth/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
