const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const requireAuth = require("../middleware/requireAuth");

router.post("/", requireAuth, reportController.submitReport);

module.exports = router;
