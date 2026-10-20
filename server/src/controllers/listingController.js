const listingModel = require("../models/listingModel");

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

module.exports = { handleCreateListing, handleGetSellerContact };
