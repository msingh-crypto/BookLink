const db = require("../config/db");

const addPhotoToListing = async (listingId, imageUrl) => {
  const query = `
    INSERT INTO listing_photos (listing_id, image_url)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [listingId, imageUrl]);
  return rows[0];
};

module.exports = { addPhotoToListing };
