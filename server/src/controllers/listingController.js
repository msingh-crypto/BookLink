const listingModel = require("../models/listingModel");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
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
      (typeof price === "string" && price.trim() === "") ||
      !Number.isFinite(Number(price)) ||
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

// GET /api/listings - browse all active listings (with optional US-03 search)
const handleGetListings = async (req, res) => {
  try {
    const limit = parseNonNegativeInt(req.query.limit, DEFAULT_PAGE_SIZE);
    const offset = parseNonNegativeInt(req.query.offset, 0);

    const sortBy = req.query.sortBy || "newest";
    const sortOrder = req.query.sortOrder || "desc";
    const rawSearch =
      req.query.search !== undefined
        ? req.query.search
        : req.query.q !== undefined
          ? req.query.q
          : "";

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

    const validSortFields = ["newest", "price", "condition"];
    const validSortOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: "Invalid sorting field.",
      });
    }

    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        error: "Invalid sorting order.",
      });
    }

    if (
      typeof rawSearch !== "string" ||
      rawSearch.trim().length > MAX_SEARCH_LENGTH
    ) {
      return res.status(400).json({
        error: `search must be a string up to ${MAX_SEARCH_LENGTH} characters.`,
      });
    }

    const trimmedSearch = rawSearch.trim();
    const queryOptions = {
      limit,
      offset,
      sortBy,
      sortOrder,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    };

    const { listings, total } =
      await listingModel.getActiveListings(queryOptions);

    return res.status(200).json({ listings, total, limit, offset });
  } catch (err) {
    console.error("Error fetching listings:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const handleGetSellerContact = async (req, res) => {
  try {
    const listingId = req.params.id;
    const seller = await listingModel.getSellerContactByListingId(listingId);

    if (!seller) {
      return res.status(404).json({ error: "Listing or seller not found." });
    }

    return res.status(200).json({ email: seller.email });
  } catch (err) {
    console.error("Error retrieving seller contact:", err);
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

// US-07: Statuses a seller can set on their own listing
const LISTING_STATUSES = ["active", "sold", "removed"];

// GET /api/listings/mine - every listing the logged-in seller owns (US-07)
const handleGetMyListings = async (req, res) => {
  try {
    // 1. The seller is always the session user, never a client-supplied id
    const sellerId = req.user.id;

    // 2. Load the seller's listings in every status
    const listings = await listingModel.getListingsBySeller(sellerId);

    // 3. Return them with a total
    return res.status(200).json({ listings, total: listings.length });
  } catch (err) {
    console.error("Error fetching seller listings:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// PATCH /api/listings/:id/status - seller changes their listing's status (US-07)
const handleUpdateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    // 1. Validate the listing id and the requested status
    if (!UUID_PATTERN.test(id)) {
      return res.status(404).json({ error: "Listing not found." });
    }

    if (!LISTING_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${LISTING_STATUSES.join(", ")}.`,
      });
    }

    // 2. Make sure the listing exists
    const listing = await listingModel.getListingOwnership(id);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    // 3. Only the owner (from the session) may change it
    if (listing.seller_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only manage your own listings." });
    }

    // 4. A listing taken down by a moderator stays down
    if (listing.removed_by_moderator) {
      return res.status(403).json({
        error: "This listing was removed by a moderator and can't be changed.",
      });
    }

    // 5. Update the status (the query is also scoped to the owner)
    const updated = await listingModel.updateListingStatus(
      id,
      req.user.id,
      status,
    );

    if (!updated) {
      return res.status(404).json({ error: "Listing not found." });
    }

    // 6. Return the updated listing
    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating listing status:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  handleCreateListing,
  handleGetListings,
  handleGetListingById,
  handleGetSellerContact,
  handleGetMyListings,
  handleUpdateListingStatus,
};
