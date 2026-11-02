const db = require("../config/db");

const addFavourite = async (userId, listingId) => {
  const query = `
    INSERT INTO favourites (user_id, listing_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, listing_id) DO NOTHING
    RETURNING user_id, listing_id, created_at;
  `;
  const { rows } = await db.query(query, [userId, listingId]);
  return rows[0] || { user_id: userId, listing_id: listingId };
};

const removeFavourite = async (userId, listingId) => {
  const query = `
    DELETE FROM favourites
    WHERE user_id = $1 AND listing_id = $2
    RETURNING user_id, listing_id;
  `;
  const { rowCount } = await db.query(query, [userId, listingId]);
  return rowCount > 0;
};

const getUserFavouriteListings = async (userId) => {
  const query = `
    SELECT
      l.id,
      l.seller_id,
      l.title,
      l.isbn,
      l.course_code,
      l.edition,
      l.condition,
      l.price::float AS price,
      l.meetup_zone,
      l.description,
      l.status,
      l.created_at,
      c.name AS category_name,
      c.code AS category_code,
      f.created_at AS favourited_at,
      COALESCE(
        (
          SELECT json_agg(p.image_url ORDER BY p.created_at, p.id)
          FROM listing_photos p
          WHERE p.listing_id = l.id
        ),
        '[]'::json
      ) AS photos
    FROM favourites f
    INNER JOIN listings l ON l.id = f.listing_id
    LEFT JOIN categories c ON c.id = l.category_id
    WHERE f.user_id = $1 AND l.status = 'active'
    ORDER BY f.created_at DESC;
  `;
  const { rows } = await db.query(query, [userId]);
  return rows;
};

module.exports = {
  addFavourite,
  removeFavourite,
  getUserFavouriteListings,
};
