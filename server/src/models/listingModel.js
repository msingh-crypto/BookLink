const db = require("../config/db");

const createListing = async (listingData) => {
  const {
    seller_id,
    category_id,
    department_id,
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
      edition, condition, price, meetup_zone, description, department_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    department_id || null,
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
  l.category_id,
  l.department_id,
  d.name AS department_name,
  d.code AS department_code,
  c.name AS category_name,
  c.code AS category_code
`;

// Return all active listings with their photo URLs.
// Supports US-03 search and US-04 combined filtering (department, condition, courseCode) & sorting.
const getActiveListings = async ({
  limit = 50,
  offset = 0,
  sortBy = "newest",
  sortOrder = "desc",
  search = "",
  department = "",
  category = "",
  condition = "",
  courseCode = "",
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

  const conditions = ["l.status = 'active'"];
  const params = [];

  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  if (trimmedSearch) {
    const searchPattern = `%${trimmedSearch}%`;
    const normalizedToken = trimmedSearch.replace(/[-\s]/g, "");
    const normalizedPattern = normalizedToken
      ? `%${normalizedToken}%`
      : searchPattern;

    params.push(searchPattern, normalizedPattern);
    const patternIdx = params.length - 1;
    const normalizedIdx = params.length;

    conditions.push(`(
      l.title ILIKE $${patternIdx}
      OR l.course_code ILIKE $${patternIdx}
      OR REPLACE(REPLACE(COALESCE(l.course_code, ''), '-', ''), ' ', '') ILIKE $${normalizedIdx}
      OR REPLACE(REPLACE(COALESCE(l.isbn, ''), '-', ''), ' ', '') ILIKE $${normalizedIdx}
    )`);
  }

  const trimmedDepartment =
    typeof department === "string" ? department.trim() : "";
  if (trimmedDepartment) {
    params.push(trimmedDepartment);
    const deptIdx = params.length;
    conditions.push(`UPPER(d.code) = UPPER($${deptIdx})`);
  }

  if (category) {
    params.push(category);
    conditions.push(`l.category_id = $${params.length}`);
  }

  const trimmedCondition =
    typeof condition === "string" ? condition.trim() : "";
  if (trimmedCondition) {
    params.push(trimmedCondition);
    const condIdx = params.length;
    conditions.push(`l.condition = $${condIdx}`);
  }

  const trimmedCourseCode =
    typeof courseCode === "string" ? courseCode.trim() : "";
  if (trimmedCourseCode) {
    const normalizedCourseToken = trimmedCourseCode.replace(/[-\s]/g, "");
    const coursePattern = normalizedCourseToken
      ? `%${normalizedCourseToken}%`
      : `%${trimmedCourseCode}%`;

    params.push(coursePattern);
    const courseIdx = params.length;
    conditions.push(
      `REPLACE(REPLACE(COALESCE(l.course_code, ''), '-', ''), ' ', '') ILIKE $${courseIdx}`,
    );
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM listings l
    LEFT JOIN categories c ON c.id = l.category_id
    LEFT JOIN departments d ON d.id = l.department_id
    ${whereClause};
  `;

  const dataParams = [...params, limit, offset];
  const limitIdx = dataParams.length - 1;
  const offsetIdx = dataParams.length;

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
    LEFT JOIN departments d ON d.id = l.department_id
    ${whereClause}
    ORDER BY ${sortColumn} ${direction}, l.created_at DESC, l.id
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const [listingResult, countResult] = await Promise.all([
    db.query(query, dataParams),
    db.query(countQuery, params),
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
    LEFT JOIN departments d ON d.id = l.department_id
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

// US-07: True when a moderator removed the listing (admin removal marks the
// listing's reports as 'action_taken'). Owners may not undo that.
const REMOVED_BY_MODERATOR_SQL = `
  (
    l.status = 'removed'
    AND EXISTS (
      SELECT 1 FROM reports r
      WHERE r.reported_listing_id = l.id AND r.status = 'action_taken'
    )
  )
`;

// US-07: Return every listing owned by the seller, in any status, newest first.
const getListingsBySeller = async (sellerId) => {
  const query = `
    SELECT
      ${PUBLIC_LISTING_COLUMNS},
      l.updated_at,
      ${REMOVED_BY_MODERATOR_SQL} AS removed_by_moderator,
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
    LEFT JOIN departments d ON d.id = l.department_id
    WHERE l.seller_id = $1
    ORDER BY l.created_at DESC, l.id;
  `;

  const { rows } = await db.query(query, [sellerId]);
  return rows;
};

// US-07: Minimal lookup (any status) used to check ownership before an update.
const getListingOwnership = async (id) => {
  const query = `
    SELECT
      l.id,
      l.seller_id,
      l.status,
      ${REMOVED_BY_MODERATOR_SQL} AS removed_by_moderator
    FROM listings l
    WHERE l.id = $1;
  `;

  const { rows } = await db.query(query, [id]);
  return rows[0];
};

// US-07: Change a listing's status. The seller_id condition means a row is
// only ever updated for its owner, even if the caller skipped the check.
const updateListingStatus = async (id, sellerId, status) => {
  const query = `
    UPDATE listings
    SET status = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND seller_id = $2
    RETURNING id, seller_id, title, status, updated_at;
  `;

  const { rows } = await db.query(query, [id, sellerId, status]);
  return rows[0];
};

module.exports = {
  createListing,
  getActiveListings,
  getListingById,
  getSellerContactByListingId,
  getListingsBySeller,
  getListingOwnership,
  updateListingStatus,
};
