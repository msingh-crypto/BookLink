const express = require("express");
const router = express.Router();
const taxonomyController = require("../controllers/taxonomyController");

// Public routes for form dropdowns & search filters
router.get("/categories", taxonomyController.getCategories);
router.get("/departments", taxonomyController.getDepartments);

module.exports = router;
