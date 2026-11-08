const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

const REPORTER_ID = "e1111111-1111-1111-1111-111111111111";
const REPORTED_USER_ID = "e2222222-2222-2222-2222-222222222222";
const TEST_LISTING_ID = "e3333333-3333-3333-3333-333333333333";
const REPORTER_EMAIL = "reporter.us11@lakeheadu.ca";
const REPORTED_EMAIL = "reported.us11@lakeheadu.ca";
const TEST_PASSWORD = "Password123!";

describe("US-11: Report Suspicious Listings or Profiles API (/api/reports)", () => {
  beforeAll(async () => {
    await db.query(`DELETE FROM reports WHERE reporter_id = $1;`, [
      REPORTER_ID,
    ]);
    await db.query(`DELETE FROM listings WHERE id = $1;`, [TEST_LISTING_ID]);
    await db.query(`DELETE FROM users WHERE id IN ($1, $2);`, [
      REPORTER_ID,
      REPORTED_USER_ID,
    ]);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE);
    `,
      [REPORTER_ID, REPORTER_EMAIL, passwordHash],
    );

    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE);
    `,
      [REPORTED_USER_ID, REPORTED_EMAIL, passwordHash],
    );

    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description, status)
      VALUES ($1, $2, 'Suspicious Text', 'COMP-1111', 'Fair', 20.00, 'Agora', 'Suspicious listing desc', 'active');
    `,
      [TEST_LISTING_ID, REPORTED_USER_ID],
    );
  });

  afterAll(async () => {
    await db.query(`DELETE FROM reports WHERE reporter_id = $1;`, [
      REPORTER_ID,
    ]);
    await db.query(`DELETE FROM listings WHERE id = $1;`, [TEST_LISTING_ID]);
    await db.query(`DELETE FROM users WHERE id IN ($1, $2);`, [
      REPORTER_ID,
      REPORTED_USER_ID,
    ]);
  });

  describe("POST /api/reports", () => {
    it("should return 401 Unauthorized when unauthenticated user submits a report", async () => {
      const res = await request(app).post("/api/reports").send({
        reportedListingId: TEST_LISTING_ID,
        reasonCategory: "Scam/Fraud",
        description: "Seller asking for gift cards.",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should return 400 Bad Request if neither listing ID nor profile ID is supplied", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: REPORTER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/reports").send({
        reasonCategory: "Spam",
        description: "Missing target",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 400 Bad Request if reasonCategory is missing", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: REPORTER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/reports").send({
        reportedListingId: TEST_LISTING_ID,
        description: "No category selected",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 201 Created when reporting a suspicious listing", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: REPORTER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/reports").send({
        reportedListingId: TEST_LISTING_ID,
        reasonCategory: "Scam/Fraud",
        description: "Seller requested off-platform payment via external link.",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.reported_listing_id).toBe(TEST_LISTING_ID);
      expect(res.body.reason_category).toBe("Scam/Fraud");
      expect(res.body.status).toBe("pending");
    });

    it("should return 201 Created when reporting a suspicious user profile", async () => {
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: REPORTER_EMAIL, password: TEST_PASSWORD });

      const res = await agent.post("/api/reports").send({
        reportedUserId: REPORTED_USER_ID,
        reasonCategory: "Inappropriate Behavior",
        description: "User sending harassment messages.",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.reported_user_id).toBe(REPORTED_USER_ID);
      expect(res.body.reason_category).toBe("Inappropriate Behavior");
      expect(res.body.status).toBe("pending");
    });
  });
});
