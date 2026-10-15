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

module.exports = { createListing };
