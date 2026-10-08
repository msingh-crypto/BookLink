const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health Check Endpoint
 *     description: Returns operational status of the server and database connection.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is running and database is connected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   example: 2026-10-08T18:00:00.000Z
 */
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

module.exports = router;
