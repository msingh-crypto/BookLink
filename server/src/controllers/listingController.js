const listingModel = require("../models/listingModel");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleCreateListing = async (req, res) => {
  try {
    const {
      seller_id,
      title,
      course_code,
      condition,
      price,
      meetup_zone,
      description,
    } = req.body;

    if (
      !seller_id ||
      !title ||
      !course_code ||
      !condition ||
      !meetup_zone ||
      !description
    ) {
      return res
        .status(400)
        .json({ error: "Missing required mandatory fields." });
    }

    if (
      price === undefined ||
      price === null ||
      isNaN(price) ||
      Number(price) < 0
    ) {
      return res
        .status(400)
        .json({ error: "Price must be a valid non-negative number." });
    }

    const newListing = await listingModel.createListing(req.body);

    return res.status(201).json(newListing);
  } catch (err) {
    console.error("Error creating listing:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Parse an optional non-negative integer query parameter.
// Returns the fallback when absent, or null when invalid.
const parseNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === "") {
    return fallback;
  }
  if (!/^\d+$/.test(String(value))) {
    return null;
  }
  return Number(value);
};

// GET /api/listings - browse all active listings
const handleGetListings = async (req, res) => {
  try {
    const limit = parseNonNegativeInt(req.query.limit, DEFAULT_PAGE_SIZE);
    const offset = parseNonNegativeInt(req.query.offset, 0);

    if (limit === null || limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({
        error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      });
    }

    if (offset === null) {
      return res
        .status(400)
        .json({ error: "offset must be a non-negative integer." });
    }

    const { listings, total } = await listingModel.getActiveListings({
      limit,
      offset,
    });

    return res.status(200).json({ listings, total, limit, offset });
  } catch (err) {
    console.error("Error fetching listings:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/listings/:id - view a single active listing
const handleGetListingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!UUID_PATTERN.test(id)) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const listing = await listingModel.getListingById(id);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    return res.status(200).json(listing);
  } catch (err) {
    console.error("Error fetching listing:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  handleCreateListing,
  handleGetListings,
  handleGetListingById,
};
