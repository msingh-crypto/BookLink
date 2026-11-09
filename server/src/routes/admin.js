const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const adminController = require("../controllers/adminController");
const taxonomyController = require("../controllers/taxonomyController");
const analyticsController = require("../controllers/analyticsController");

// All admin routes require authenticated session with admin or moderator role
router.use(requireAuth);
router.use(requireRole("admin", "moderator"));

router.get("/reports", adminController.getQueue);
router.patch("/listings/:id/remove", adminController.handleRemoveListing);
router.patch("/users/:id/suspend", adminController.handleSuspendUser);
router.patch(
  "/users/:id/role",
  requireRole("admin"),
  taxonomyController.handlePromoteUser,
);
router.post("/taxonomy/categories", taxonomyController.handleCreateCategory);
router.patch(
  "/taxonomy/categories/:id",
  taxonomyController.handleUpdateCategory,
);
router.post("/taxonomy/departments", taxonomyController.handleCreateDepartment);
router.patch(
  "/taxonomy/departments/:id",
  taxonomyController.handleUpdateDepartment,
);
router.get(
  "/analytics",
  requireRole("admin"),
  analyticsController.getAnalytics,
);

module.exports = router;
