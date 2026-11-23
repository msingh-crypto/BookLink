const db = require("../config/db");

// US-09: A conversation is every message about one listing between the
// session user and one other user (the seller and one buyer).

// The listing fields needed to decide who may message whom.
const getListingForMessaging = async (listingId) => {
  const { rows } = await db.query(
    `SELECT id, seller_id, title, status FROM listings WHERE id = $1;`,
    [listingId],
  );
  return rows[0];
};

// A user's Lakehead email, first name and account status.
const getUserContact = async (userId) => {
  const { rows } = await db.query(
    `
    SELECT u.id, u.email, u.status, p.first_name
    FROM users u
    LEFT JOIN user_profiles p ON p.email = u.email
    WHERE u.id = $1;
    `,
    [userId],
  );
  return rows[0];
};

// True when the two users have already exchanged a message about the listing.
const conversationExists = async (listingId, userId, otherUserId) => {
  const { rows } = await db.query(
    `
    SELECT EXISTS (
      SELECT 1 FROM messages
      WHERE listing_id = $1
        AND ((sender_id = $2 AND receiver_id = $3)
          OR (sender_id = $3 AND receiver_id = $2))
    ) AS exists;
    `,
    [listingId, userId, otherUserId],
  );
  return rows[0].exists;
};

const createMessage = async ({ listingId, senderId, receiverId, body }) => {
  const { rows } = await db.query(
    `
    INSERT INTO messages (listing_id, sender_id, receiver_id, message_body)
    VALUES ($1, $2, $3, $4)
    RETURNING id, listing_id, sender_id, receiver_id, message_body, is_read, created_at;
    `,
    [listingId, senderId, receiverId, body],
  );
  return rows[0];
};

// Unread messages one sender has sent the receiver about a listing.
const countUnreadInConversation = async (listingId, receiverId, senderId) => {
  const { rows } = await db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM messages
    WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = FALSE;
    `,
    [listingId, receiverId, senderId],
  );
  return rows[0].count;
};

// The user's inbox: one row per conversation, most recent activity first.
const getConversations = async (userId) => {
  const { rows } = await db.query(
    `
    WITH mine AS (
      SELECT
        m.*,
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id
      FROM messages m
      WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.listing_id IS NOT NULL
    ),
    latest AS (
      SELECT DISTINCT ON (listing_id, other_user_id)
        listing_id,
        other_user_id,
        message_body AS last_message,
        sender_id AS last_sender_id,
        created_at AS last_message_at
      FROM mine
      ORDER BY listing_id, other_user_id, created_at DESC, id DESC
    )
    SELECT
      latest.*,
      l.title AS listing_title,
      l.status AS listing_status,
      l.seller_id,
      u.email AS other_user_email,
      p.first_name AS other_user_first_name,
      (
        SELECT COUNT(*)::int FROM messages x
        WHERE x.listing_id = latest.listing_id
          AND x.sender_id = latest.other_user_id
          AND x.receiver_id = $1
          AND x.is_read = FALSE
      ) AS unread_count
    FROM latest
    JOIN listings l ON l.id = latest.listing_id
    JOIN users u ON u.id = latest.other_user_id
    LEFT JOIN user_profiles p ON p.email = u.email
    ORDER BY latest.last_message_at DESC;
    `,
    [userId],
  );
  return rows;
};

// Every message in one conversation, oldest first.
const getConversationMessages = async (listingId, userId, otherUserId) => {
  const { rows } = await db.query(
    `
    SELECT id, listing_id, sender_id, receiver_id, message_body, is_read, created_at
    FROM messages
    WHERE listing_id = $1
      AND ((sender_id = $2 AND receiver_id = $3)
        OR (sender_id = $3 AND receiver_id = $2))
    ORDER BY created_at ASC, id ASC;
    `,
    [listingId, userId, otherUserId],
  );
  return rows;
};

// Mark the messages the user received in a conversation as read.
const markConversationRead = async (listingId, userId, otherUserId) => {
  await db.query(
    `
    UPDATE messages SET is_read = TRUE
    WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = FALSE;
    `,
    [listingId, userId, otherUserId],
  );
};

const getUnreadCount = async (userId) => {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE;`,
    [userId],
  );
  return rows[0].count;
};

module.exports = {
  getListingForMessaging,
  getUserContact,
  conversationExists,
  createMessage,
  countUnreadInConversation,
  getConversations,
  getConversationMessages,
  markConversationRead,
  getUnreadCount,
};
