const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");
const { sendNewMessageEmail } = require("../../src/config/mailer");

jest.mock("../../src/config/mailer");

// Dedicated IDs for the US-09 messaging suite
const SELLER_ID = "a9090909-0000-4000-8000-000000000001";
const BUYER_ID = "a9090909-0000-4000-8000-000000000002";
const OTHER_ID = "a9090909-0000-4000-8000-000000000003";
const SUSPENDED_ID = "a9090909-0000-4000-8000-000000000004";
const ACTIVE_LISTING_ID = "b9090909-0000-4000-8000-000000000001";
const SOLD_LISTING_ID = "b9090909-0000-4000-8000-000000000002";
const SUSPENDED_LISTING_ID = "b9090909-0000-4000-8000-000000000003";
const MISSING_LISTING_ID = "b9090909-0000-4000-8000-000000000099";
const SELLER_EMAIL = "messages.seller@lakeheadu.ca";
const BUYER_EMAIL = "messages.buyer@lakeheadu.ca";
const OTHER_EMAIL = "messages.other@lakeheadu.ca";
const SUSPENDED_EMAIL = "messages.suspended@lakeheadu.ca";
const PASSWORD = "Password123!";

const USER_IDS = [SELLER_ID, BUYER_ID, OTHER_ID, SUSPENDED_ID];
const USER_EMAILS = [SELLER_EMAIL, BUYER_EMAIL, OTHER_EMAIL, SUSPENDED_EMAIL];
const LISTING_IDS = [ACTIVE_LISTING_ID, SOLD_LISTING_ID, SUSPENDED_LISTING_ID];

async function cleanUp() {
  await db.query(`DELETE FROM messages WHERE listing_id = ANY($1);`, [
    LISTING_IDS,
  ]);
  await db.query(`DELETE FROM listings WHERE id = ANY($1);`, [LISTING_IDS]);
  await db.query(`DELETE FROM user_profiles WHERE email = ANY($1);`, [
    USER_EMAILS,
  ]);
  await db.query(`DELETE FROM users WHERE id = ANY($1) OR email = ANY($2);`, [
    USER_IDS,
    USER_EMAILS,
  ]);
}

async function login(agent, email) {
  const res = await agent
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });
  expect(res.statusCode).toBe(200);
}

const send = (agent, payload) => agent.post("/api/messages").send(payload);

describe("In-app messaging API (US-09)", () => {
  const seller = request.agent(app);
  const buyer = request.agent(app);
  const other = request.agent(app);

  beforeAll(async () => {
    await cleanUp();
    const hash = await bcrypt.hash(PASSWORD, 10);

    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $5, $9, 'student', 'active', TRUE),
             ($2, $6, $9, 'student', 'active', TRUE),
             ($3, $7, $9, 'student', 'active', TRUE),
             ($4, $8, $9, 'student', 'suspended', TRUE);
    `,
      [...USER_IDS, ...USER_EMAILS, hash],
    );

    await db.query(
      `INSERT INTO user_profiles (email, first_name) VALUES ($1, 'Sam'), ($2, 'Bea');`,
      [SELLER_EMAIL, BUYER_EMAIL],
    );

    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description, status)
      VALUES ($1, $4, 'Messaging Active Book', 'COMP-1411', 'Good', 20, 'Agora', 'Desc', 'active'),
             ($2, $4, 'Messaging Sold Book', 'COMP-1412', 'Good', 20, 'Agora', 'Desc', 'sold'),
             ($3, $5, 'Suspended Seller Book', 'COMP-1413', 'Good', 20, 'Agora', 'Desc', 'active');
    `,
      [
        ACTIVE_LISTING_ID,
        SOLD_LISTING_ID,
        SUSPENDED_LISTING_ID,
        SELLER_ID,
        SUSPENDED_ID,
      ],
    );

    await login(seller, SELLER_EMAIL);
    await login(buyer, BUYER_EMAIL);
    await login(other, OTHER_EMAIL);
  });

  afterAll(async () => {
    await cleanUp();
  });

  beforeEach(() => {
    sendNewMessageEmail.mockReset();
    sendNewMessageEmail.mockResolvedValue();
  });

  describe("when unauthenticated", () => {
    it.each([
      ["post", "/api/messages"],
      ["get", "/api/messages/conversations"],
      ["get", `/api/messages/conversations/${ACTIVE_LISTING_ID}/${SELLER_ID}`],
      ["get", "/api/messages/unread-count"],
    ])("returns 401 for %s %s", async (method, url) => {
      const res = await request(app)[method](url).send({});
      expect(res.statusCode).toBe(401);
    });
  });

  // These run in order and share one buyer-seller conversation.
  describe("a buyer and seller conversation", () => {
    it("lets a buyer message the seller and emails the seller's Lakehead address", async () => {
      const res = await send(buyer, {
        listingId: ACTIVE_LISTING_ID,
        body: "  Hi Sam, is this still available?  ",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.emailSent).toBe(true);
      expect(res.body.message).toMatchObject({
        listing_id: ACTIVE_LISTING_ID,
        sender_id: BUYER_ID,
        receiver_id: SELLER_ID,
        message_body: "Hi Sam, is this still available?",
        is_read: false,
      });
      expect(sendNewMessageEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: SELLER_EMAIL,
          recipientName: "Sam",
          senderName: "Bea",
          senderEmail: BUYER_EMAIL,
          listingTitle: "Messaging Active Book",
          body: "Hi Sam, is this still available?",
        }),
      );
    });

    it("always delivers a buyer's message to the seller, ignoring a client-supplied receiver", async () => {
      const res = await send(buyer, {
        listingId: ACTIVE_LISTING_ID,
        receiverId: OTHER_ID,
        body: "Could we meet at the Agora?",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.message.receiver_id).toBe(SELLER_ID);
    });

    it("doesn't send another email while the seller still has unread messages", async () => {
      // The previous test's message was the second unread one
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS n FROM messages WHERE receiver_id = $1 AND is_read = FALSE AND listing_id = $2;`,
        [SELLER_ID, ACTIVE_LISTING_ID],
      );
      expect(rows[0].n).toBe(2);

      const res = await send(buyer, {
        listingId: ACTIVE_LISTING_ID,
        body: "Afternoons work best for me.",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.emailSent).toBe(false);
      expect(sendNewMessageEmail).not.toHaveBeenCalled();
    });

    it("shows the conversation in the seller's inbox with an unread count", async () => {
      const countRes = await seller.get("/api/messages/unread-count");
      expect(countRes.body.count).toBe(3);

      const res = await seller.get("/api/messages/conversations");
      expect(res.statusCode).toBe(200);

      const convo = res.body.conversations.find(
        (c) => c.listingId === ACTIVE_LISTING_ID,
      );
      expect(convo).toMatchObject({
        listingTitle: "Messaging Active Book",
        isSeller: true,
        otherUser: { id: BUYER_ID, name: "Bea", email: BUYER_EMAIL },
        lastMessage: "Afternoons work best for me.",
        lastMessageFromMe: false,
        unreadCount: 3,
      });
    });

    it("shows the same conversation in the buyer's inbox", async () => {
      const res = await buyer.get("/api/messages/conversations");
      const convo = res.body.conversations.find(
        (c) => c.listingId === ACTIVE_LISTING_ID,
      );

      expect(convo).toMatchObject({
        isSeller: false,
        otherUser: { id: SELLER_ID, name: "Sam", email: SELLER_EMAIL },
        lastMessageFromMe: true,
        unreadCount: 0,
      });
    });

    it("returns the thread oldest first and marks it read when the seller opens it", async () => {
      const res = await seller.get(
        `/api/messages/conversations/${ACTIVE_LISTING_ID}/${BUYER_ID}`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.messages.map((m) => m.message_body)).toEqual([
        "Hi Sam, is this still available?",
        "Could we meet at the Agora?",
        "Afternoons work best for me.",
      ]);

      const countRes = await seller.get("/api/messages/unread-count");
      expect(countRes.body.count).toBe(0);
    });

    it("lets the seller reply, emailing the buyer", async () => {
      const res = await send(seller, {
        listingId: ACTIVE_LISTING_ID,
        receiverId: BUYER_ID,
        body: "Yes! Tomorrow at 2pm?",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.message.receiver_id).toBe(BUYER_ID);
      expect(sendNewMessageEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: BUYER_EMAIL, senderEmail: SELLER_EMAIL }),
      );
    });

    it("doesn't let a third student read someone else's conversation", async () => {
      const res = await other.get(
        `/api/messages/conversations/${ACTIVE_LISTING_ID}/${BUYER_ID}`,
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe("who can message whom", () => {
    it("returns 400 when the seller replies without choosing a student", async () => {
      const res = await send(seller, {
        listingId: ACTIVE_LISTING_ID,
        body: "Hello?",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 403 when the seller writes to a student who never messaged them", async () => {
      const res = await send(seller, {
        listingId: ACTIVE_LISTING_ID,
        receiverId: OTHER_ID,
        body: "Want to buy my book?",
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 409 when starting a conversation on a listing that is no longer active", async () => {
      const res = await send(other, {
        listingId: SOLD_LISTING_ID,
        body: "Is this still for sale?",
      });
      expect(res.statusCode).toBe(409);
    });

    it("still allows replies in an existing conversation after the listing is sold", async () => {
      await db.query(`UPDATE listings SET status = 'sold' WHERE id = $1;`, [
        ACTIVE_LISTING_ID,
      ]);

      const res = await send(buyer, {
        listingId: ACTIVE_LISTING_ID,
        body: "Thanks for the book!",
      });
      expect(res.statusCode).toBe(201);

      await db.query(`UPDATE listings SET status = 'active' WHERE id = $1;`, [
        ACTIVE_LISTING_ID,
      ]);
    });

    it("returns 403 when the seller's account is suspended", async () => {
      const res = await send(other, {
        listingId: SUSPENDED_LISTING_ID,
        body: "Hi there",
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("validation", () => {
    it.each([
      ["an empty message", { listingId: ACTIVE_LISTING_ID, body: "   " }],
      [
        "a message over 2000 characters",
        { listingId: ACTIVE_LISTING_ID, body: "a".repeat(2001) },
      ],
      ["a malformed listing id", { listingId: "not-a-uuid", body: "Hi" }],
      ["a missing listing id", { body: "Hi" }],
    ])("returns 400 for %s", async (_label, payload) => {
      const res = await send(other, payload);
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 for a listing that does not exist", async () => {
      const res = await send(other, {
        listingId: MISSING_LISTING_ID,
        body: "Hi",
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 404 for a malformed conversation id", async () => {
      const res = await other.get("/api/messages/conversations/bad/ids");
      expect(res.statusCode).toBe(404);
    });
  });

  it("saves the message even if the notification email fails", async () => {
    sendNewMessageEmail.mockRejectedValueOnce(new Error("SMTP down"));
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await send(other, {
      listingId: ACTIVE_LISTING_ID,
      body: "Is the book still available?",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.emailSent).toBe(false);
  });
});
