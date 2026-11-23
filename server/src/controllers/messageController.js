const messageModel = require("../models/messageModel");
const { sendNewMessageEmail } = require("../config/mailer");

const MAX_MESSAGE_LENGTH = 2000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Link used in notification emails to open the inbox
function inboxUrl() {
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/?view=messages`;
}

function displayName(contact) {
  return contact.first_name || contact.email.split("@")[0];
}

// POST /api/messages - send a message about a listing (US-09)
const handleSendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { listingId, receiverId } = req.body || {};
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

    // 1. Validate the listing id and the message text
    if (!UUID_PATTERN.test(listingId || "")) {
      return res.status(400).json({ error: "A valid listingId is required." });
    }

    if (!body || body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    // 2. Make sure the listing exists
    const listing = await messageModel.getListingForMessaging(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    // 3. Work out the recipient. Buyers always write to the seller; the
    //    seller may only reply to someone who has already written to them.
    let recipientId;

    if (listing.seller_id === senderId) {
      if (!UUID_PATTERN.test(receiverId || "") || receiverId === senderId) {
        return res
          .status(400)
          .json({ error: "Choose the student you are replying to." });
      }

      const hasConversation = await messageModel.conversationExists(
        listingId,
        senderId,
        receiverId,
      );

      if (!hasConversation) {
        return res.status(403).json({
          error:
            "You can only reply to students who have messaged you about this listing.",
        });
      }

      recipientId = receiverId;
    } else {
      recipientId = listing.seller_id;

      // New conversations can only start on listings that are still for sale
      if (listing.status !== "active") {
        const hasConversation = await messageModel.conversationExists(
          listingId,
          senderId,
          recipientId,
        );

        if (!hasConversation) {
          return res
            .status(409)
            .json({ error: "This listing is no longer available." });
        }
      }
    }

    // 4. The recipient must have an active account
    const recipient = await messageModel.getUserContact(recipientId);

    if (!recipient || recipient.status !== "active") {
      return res
        .status(403)
        .json({ error: "This student can't receive messages right now." });
    }

    // 5. Save the message
    const message = await messageModel.createMessage({
      listingId,
      senderId,
      receiverId: recipientId,
      body,
    });

    // 6. Email the recipient's Lakehead address, once per batch of unread
    //    messages so a quick back-and-forth doesn't flood their inbox
    let emailSent = false;
    const unread = await messageModel.countUnreadInConversation(
      listingId,
      recipientId,
      senderId,
    );

    if (unread === 1) {
      try {
        await sendNewMessageEmail({
          to: recipient.email,
          recipientName: recipient.first_name,
          senderName: req.user.first_name || req.user.email.split("@")[0],
          senderEmail: req.user.email,
          listingTitle: listing.title,
          body,
          inboxUrl: inboxUrl(),
        });
        emailSent = true;
      } catch (mailErr) {
        // The message is saved either way; the email is only a heads-up
        console.error("Error sending message notification email:", mailErr);
      }
    }

    // 7. Return the saved message
    return res.status(201).json({ message, emailSent });
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/messages/conversations - the session user's inbox (US-09)
const handleGetConversations = async (req, res) => {
  try {
    // 1. Load every conversation the session user is part of
    const rows = await messageModel.getConversations(req.user.id);

    // 2. Shape each row for the client
    const conversations = rows.map((row) => ({
      listingId: row.listing_id,
      listingTitle: row.listing_title,
      listingStatus: row.listing_status,
      isSeller: row.seller_id === req.user.id,
      otherUser: {
        id: row.other_user_id,
        name: displayName({
          first_name: row.other_user_first_name,
          email: row.other_user_email,
        }),
        email: row.other_user_email,
      },
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      lastMessageFromMe: row.last_sender_id === req.user.id,
      unreadCount: row.unread_count,
    }));

    // 3. Return them, most recent activity first
    return res.status(200).json({ conversations });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/messages/conversations/:listingId/:otherUserId - one thread (US-09)
const handleGetConversation = async (req, res) => {
  try {
    const { listingId, otherUserId } = req.params;

    // 1. Validate the ids
    if (!UUID_PATTERN.test(listingId) || !UUID_PATTERN.test(otherUserId)) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // 2. Load the messages between the session user and the other user
    const messages = await messageModel.getConversationMessages(
      listingId,
      req.user.id,
      otherUserId,
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // 3. Opening a conversation marks the messages received in it as read
    await messageModel.markConversationRead(
      listingId,
      req.user.id,
      otherUserId,
    );

    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/messages/unread-count - unread badge for the navbar (US-09)
const handleGetUnreadCount = async (req, res) => {
  try {
    const count = await messageModel.getUnreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    console.error("Error counting unread messages:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  handleSendMessage,
  handleGetConversations,
  handleGetConversation,
  handleGetUnreadCount,
};
