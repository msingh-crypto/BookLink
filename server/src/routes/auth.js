const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

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

module.exports = router;
