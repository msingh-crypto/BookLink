const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const {
  handleGetSellerRatings,
  handleSubmitRating,
} = require("../controllers/ratingController");

router.get("/sellers/:sellerId/ratings", handleGetSellerRatings);

router.post("/ratings", requireAuth, handleSubmitRating);

module.exports = router;
