const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const {
  handleGetFavourites,
  handleAddFavourite,
  handleRemoveFavourite,
} = require("../controllers/favouriteController");

router.get("/favourites", requireAuth, handleGetFavourites);
router.post("/favourites/:listingId", requireAuth, handleAddFavourite);
router.delete("/favourites/:listingId", requireAuth, handleRemoveFavourite);

module.exports = router;
