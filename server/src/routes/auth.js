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
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@lakeheadu.ca
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: Account successfully registered.
 *       400:
 *         description: Validation failed (missing fields or invalid domain).
 *       409:
 *         description: Account already exists.
 *       500:
 *         description: Internal server error.
 */
router.post("/auth/register", authController.register);

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
 *         description: Account is not active
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
