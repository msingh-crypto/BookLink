const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const adminController = require("../controllers/adminController");

// All admin routes require authenticated session with admin or moderator role
router.use(requireAuth);
router.use(requireRole("admin", "moderator"));

router.get("/reports", adminController.getQueue);
router.patch("/listings/:id/remove", adminController.handleRemoveListing);
router.patch("/users/:id/suspend", adminController.handleSuspendUser);

module.exports = router;
