const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

// Dedicated unique IDs for US-10 Ratings test suite
const RATING_SELLER_ID = "99999999-9999-9999-9999-999999999999";
const RATING_BUYER_ID = "88888888-8888-8888-8888-888888888888";
const SELLER_EMAIL = "seller.ratings@lakeheadu.ca";
const BUYER_EMAIL = "buyer.ratings@lakeheadu.ca";
const TEST_PASSWORD = "Password123!";

describe("US-10: Rate Student Sellers API (/api/ratings & /api/sellers/:sellerId/ratings)", () => {
  beforeAll(async () => {
    // 1. Clean up potential leftover state
    await db.query(
      `DELETE FROM seller_ratings WHERE seller_id = $1 OR buyer_id = $2;`,
      [RATING_SELLER_ID, RATING_BUYER_ID],
    );
    await db.query(
      `DELETE FROM users WHERE id IN ($1, $2) OR email IN ($3, $4);`,
      [RATING_SELLER_ID, RATING_BUYER_ID, SELLER_EMAIL, BUYER_EMAIL],
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // 2. Insert test seller account (email_verified: TRUE)
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE);
    `,
      [RATING_SELLER_ID, SELLER_EMAIL, passwordHash],
    );

    // 3. Insert test buyer account (email_verified: TRUE)
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE);
    `,
      [RATING_BUYER_ID, BUYER_EMAIL, passwordHash],
    );
  });

  afterAll(async () => {
    await db.query(
      `DELETE FROM seller_ratings WHERE seller_id = $1 OR buyer_id = $2;`,
      [RATING_SELLER_ID, RATING_BUYER_ID],
    );
    await db.query(
      `DELETE FROM users WHERE id IN ($1, $2) OR email IN ($3, $4);`,
      [RATING_SELLER_ID, RATING_BUYER_ID, SELLER_EMAIL, BUYER_EMAIL],
    );
  });

  describe("GET /api/sellers/:sellerId/ratings", () => {
    it("should return empty metrics and list when seller has no ratings yet", async () => {
      const res = await request(app).get(
        `/api/sellers/${RATING_SELLER_ID}/ratings`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("average_rating", 0);
      expect(res.body).toHaveProperty("total_reviews", 0);
      expect(res.body.reviews).toEqual([]);
    });
  });

  describe("POST /api/ratings", () => {
    it("should return 401 Unauthorized when unauthenticated user attempts to submit rating", async () => {
      const res = await request(app).post("/api/ratings").send({
        sellerId: RATING_SELLER_ID,
        rating: 5,
        reviewText: "Great seller!",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should return 400 Bad Request if rating is invalid (< 1 or > 5)", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: BUYER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/ratings").send({
        sellerId: RATING_SELLER_ID,
        rating: 6,
        reviewText: "Invalid score test",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 201 Created when buyer submits a valid rating and review", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: BUYER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/ratings").send({
        sellerId: RATING_SELLER_ID,
        rating: 5,
        reviewText: "Smooth transaction at Agora!",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.rating).toBe(5);
      expect(res.body.review_text).toBe("Smooth transaction at Agora!");
    });

    it("should return 400 Bad Request when buyer tries submitting a duplicate review for same seller", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: BUYER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/ratings").send({
        sellerId: RATING_SELLER_ID,
        rating: 4,
        reviewText: "Duplicate attempt review",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/already submitted/i);
    });
  });

  describe("GET /api/sellers/:sellerId/ratings (Post-Submission Verification)", () => {
    it("should return updated cumulative average, count, and individual review list", async () => {
      const res = await request(app).get(
        `/api/sellers/${RATING_SELLER_ID}/ratings`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.average_rating).toBe(5);
      expect(res.body.total_reviews).toBe(1);
      expect(res.body.reviews.length).toBe(1);
      expect(res.body.reviews[0]).toHaveProperty(
        "review_text",
        "Smooth transaction at Agora!",
      );
      expect(res.body.reviews[0]).toHaveProperty("buyer_email", BUYER_EMAIL);
    });
  });
});
