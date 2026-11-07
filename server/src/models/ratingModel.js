const db = require("../config/db");

async function getSellerRatingDetails(sellerId) {
  const summaryQuery = `
    SELECT 
      COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
      COUNT(id)::INT AS total_reviews
    FROM seller_ratings
    WHERE seller_id = $1;
  `;

  const reviewsQuery = `
    SELECT 
      r.id,
      r.rating,
      r.review_text,
      r.created_at,
      u.email AS buyer_email -- Or u.full_name depending on your user schema
    FROM seller_ratings r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.seller_id = $1
    ORDER BY r.created_at DESC;
  `;

  const [summaryRes, reviewsRes] = await Promise.all([
    db.query(summaryQuery, [sellerId]),
    db.query(reviewsQuery, [sellerId]),
  ]);

  return {
    average_rating: Number(summaryRes.rows[0].average_rating),
    total_reviews: summaryRes.rows[0].total_reviews,
    reviews: reviewsRes.rows,
  };
}

async function createRating({ sellerId, buyerId, rating, reviewText }) {
  const query = `
    INSERT INTO seller_ratings (seller_id, buyer_id, rating, review_text)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [
    sellerId,
    buyerId,
    rating,
    reviewText,
  ]);
  return rows[0];
}

module.exports = {
  getSellerRatingDetails,
  createRating,
};
