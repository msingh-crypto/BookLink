const db = require("../config/db");

const createListing = async (listingData) => {
  const {
    seller_id,
    category_id,
    title,
    isbn,
    course_code,
    edition,
    condition,
    price,
    meetup_zone,
    description,
  } = listingData;

  const query = `
        INSERT INTO listings (
            seller_id, category_id, title, isbn, course_code,
            edition, condition, price, meetup_zone, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
    `;

  const values = [
    seller_id,
    category_id || null,
    title,
    isbn || null,
    course_code,
    edition || null,
    condition,
    price,
    meetup_zone,
    description,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

// Public-facing columns only. Seller contact details (email, etc.) are
// deliberately left out to protect seller privacy (US-08).
const PUBLIC_LISTING_COLUMNS = `
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
  c.code AS category_code
`;

// Return all active listings, newest first, with their photo URLs.
const getActiveListings = async ({
  limit = 50,
  offset = 0,
  sortBy = "newest",
  sortOrder = "desc",
} = {}) => {
  const sortColumns = {
    newest: "l.created_at",
    price: "l.price",
    condition: `CASE l.condition
    WHEN 'Poor' THEN 1
    WHEN 'Fair' THEN 2
    WHEN 'Good' THEN 3
    WHEN 'Like New' THEN 4
    WHEN 'New' THEN 5
    ELSE 0
  END`,
  };

  const sortColumn = sortColumns[sortBy] || sortColumns.newest;
  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  const query = `
    SELECT
      ${PUBLIC_LISTING_COLUMNS},
      COALESCE(
        (
          SELECT json_agg(p.image_url ORDER BY p.created_at, p.id)
          FROM listing_photos p
          WHERE p.listing_id = l.id
        ),
        '[]'::json
      ) AS photos
    FROM listings l
    LEFT JOIN categories c ON c.id = l.category_id
    WHERE l.status = 'active'
    ORDER BY ${sortColumn} ${direction}, l.created_at DESC, l.id
    LIMIT $1 OFFSET $2;
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM listings WHERE status = 'active';`;

  const [listingResult, countResult] = await Promise.all([
    db.query(query, [limit, offset]),
    db.query(countQuery),
  ]);

  return {
    listings: listingResult.rows,
    total: countResult.rows[0].total,
  };
};

// Return a single active listing with all of its photos, or undefined.
const getListingById = async (id) => {
  const query = `
    SELECT
      ${PUBLIC_LISTING_COLUMNS},
      COALESCE(
        (
          SELECT json_agg(p.image_url ORDER BY p.created_at, p.id)
          FROM listing_photos p
          WHERE p.listing_id = l.id
        ),
        '[]'::json
      ) AS photos
    FROM listings l
    LEFT JOIN categories c ON c.id = l.category_id
    WHERE l.id = $1 AND l.status = 'active';
  `;

  const { rows } = await db.query(query, [id]);
  return rows[0];
};

const getSellerContactByListingId = async (listingId) => {
  const query = `
    SELECT u.email
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.id = $1;
  `;
  const { rows } = await db.query(query, [listingId]);
  return rows[0];
};

module.exports = {
  createListing,
  getActiveListings,
  getListingById,
  getSellerContactByListingId,
};
