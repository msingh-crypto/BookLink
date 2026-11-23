const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const {
  handleSendMessage,
  handleGetConversations,
  handleGetConversation,
  handleGetUnreadCount,
} = require("../controllers/messageController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         listing_id:
 *           type: string
 *           format: uuid
 *         sender_id:
 *           type: string
 *           format: uuid
 *         receiver_id:
 *           type: string
 *           format: uuid
 *         message_body:
 *           type: string
 *         is_read:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message about a listing (US-09)
 *     description: >
 *       Buyers always write to the listing's seller. The seller may only reply to
 *       a student who has already messaged them about that listing (pass receiverId).
 *       The recipient gets an email at their Lakehead address, with Reply-To set to the sender.
 *     tags: [Messages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, body]
 *             properties:
 *               listingId:
 *                 type: string
 *                 format: uuid
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *                 description: Required only when the seller replies
 *               body:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Hi! Is this book still available?"
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *                 emailSent:
 *                   type: boolean
 *       400:
 *         description: Invalid listing id, empty or too long message, or missing receiverId on a seller reply
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Seller replying to someone who hasn't written to them, or recipient account suspended
 *       404:
 *         description: Listing not found
 *       409:
 *         description: New conversation on a listing that is no longer active
 */
router.post("/messages", requireAuth, handleSendMessage);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: The logged-in user's inbox, most recent conversation first (US-09)
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: One entry per listing and other user, with the last message and unread count
 *       401:
 *         description: Authentication required
 */
router.get("/messages/conversations", requireAuth, handleGetConversations);

/**
 * @swagger
 * /api/messages/conversations/{listingId}/{otherUserId}:
 *   get:
 *     summary: Messages in one conversation, oldest first; marks received messages as read (US-09)
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The conversation's messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No conversation between these users about this listing
 */
router.get(
  "/messages/conversations/:listingId/:otherUserId",
  requireAuth,
  handleGetConversation,
);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Number of unread messages for the navbar badge (US-09)
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Unread message count
 *         content:
 *           application/json:
 *             example:
 *               count: 2
 *       401:
 *         description: Authentication required
 */
router.get("/messages/unread-count", requireAuth, handleGetUnreadCount);

module.exports = router;
