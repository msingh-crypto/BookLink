const ratingModel = require("../models/ratingModel");

async function handleGetSellerRatings(req, res) {
  try {
    const { sellerId } = req.params;
    const ratingDetails = await ratingModel.getSellerRatingDetails(sellerId);
    return res.status(200).json(ratingDetails);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to retrieve seller ratings and reviews." });
  }
}

async function handleSubmitRating(req, res) {
  try {
    const buyerId = req.user.id;
    const { sellerId, rating, reviewText } = req.body;

    if (!sellerId || !rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: "Seller ID and valid rating (1-5) are required." });
    }

    const newRating = await ratingModel.createRating({
      sellerId,
      buyerId,
      rating,
      reviewText,
    });

    return res.status(201).json(newRating);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        error: "You have already submitted a review for this seller.",
      });
    }
    return res.status(500).json({ error: "Failed to submit rating." });
  }
}

module.exports = { handleGetSellerRatings, handleSubmitRating };
