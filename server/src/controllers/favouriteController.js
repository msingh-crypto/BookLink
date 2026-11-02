const favouriteModel = require("../models/favouriteModel");
const listingModel = require("../models/listingModel");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleGetFavourites = async (req, res) => {
  try {
    const listings = await favouriteModel.getUserFavouriteListings(req.user.id);
    const favouriteIds = listings.map((item) => item.id);
    return res.status(200).json({
      listings,
      favouriteIds,
      total: listings.length,
    });
  } catch (err) {
    console.error("Error fetching favourites:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const handleAddFavourite = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!UUID_PATTERN.test(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }

    const listing = await listingModel.getListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const favourite = await favouriteModel.addFavourite(req.user.id, listingId);
    return res.status(201).json({
      message: "Listing added to favourites.",
      favourite,
    });
  } catch (err) {
    console.error("Error adding favourite:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const handleRemoveFavourite = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!UUID_PATTERN.test(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID." });
    }

    await favouriteModel.removeFavourite(req.user.id, listingId);
    return res.status(200).json({
      message: "Listing removed from favourites.",
    });
  } catch (err) {
    console.error("Error removing favourite:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  handleGetFavourites,
  handleAddFavourite,
  handleRemoveFavourite,
};
