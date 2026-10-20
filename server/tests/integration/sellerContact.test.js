const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

// Dedicated IDs for US-08 contact suite
const CONTACT_SUITE_SELLER_ID = "b2222222-2222-2222-2222-222222222222";
const CONTACT_SUITE_LISTING_ID = "c3333333-3333-3333-3333-333333333333";
const TEST_EMAIL = "contact.seller@lakeheadu.ca";
const TEST_PASSWORD = "Password123!";

describe("GET /api/listings/:id/contact - Protected Seller Contact Info (US-08)", () => {
  beforeAll(async () => {
    // Clean up potential leftover state
    await db.query(`DELETE FROM listings WHERE id = $1;`, [
      CONTACT_SUITE_LISTING_ID,
    ]);
    await db.query(`DELETE FROM users WHERE id = $1 OR email = $2;`, [
      CONTACT_SUITE_SELLER_ID,
      TEST_EMAIL,
    ]);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Insert test seller account
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'student', 'active');
    `,
      [CONTACT_SUITE_SELLER_ID, TEST_EMAIL, passwordHash],
    );

    // Insert test listing linked to test seller
    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description)
      VALUES ($1, $2, 'Software Engineering', 'COMP-3155', 'Good', 45.00, 'Agora', 'Clean copy');
    `,
      [CONTACT_SUITE_LISTING_ID, CONTACT_SUITE_SELLER_ID],
    );
  });

  afterAll(async () => {
    await db.query(`DELETE FROM listings WHERE id = $1;`, [
      CONTACT_SUITE_LISTING_ID,
    ]);
    await db.query(`DELETE FROM users WHERE id = $1 OR email = $2;`, [
      CONTACT_SUITE_SELLER_ID,
      TEST_EMAIL,
    ]);
  });

  it("should return 401 Unauthorized when an unauthenticated request is made", async () => {
    const res = await request(app).get(
      `/api/listings/${CONTACT_SUITE_LISTING_ID}/contact`,
    );

    expect(res.statusCode).toBe(401);
  });

  it("should return 200 OK and seller email when request is authenticated", async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post("/api/auth/login").send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(loginRes.statusCode).toBe(200);

    const res = await agent.get(
      `/api/listings/${CONTACT_SUITE_LISTING_ID}/contact`,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("email", TEST_EMAIL);
  });
});
