const express = require("express");
const router = express.Router();
const { handleCreateListing } = require("../controllers/listingController");

router.post("/listings", handleCreateListing);

module.exports = router;
