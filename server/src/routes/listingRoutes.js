const express = require("express");
const router = express.Router();
const upload = require("../config/upload");
const { handleCreateListing } = require("../controllers/listingController");
const { uploadListingPhoto } = require("../controllers/photoController");

router.post("/listings", handleCreateListing);
router.post(
  "/listings/:id/photos",
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadListingPhoto,
);

module.exports = router;
