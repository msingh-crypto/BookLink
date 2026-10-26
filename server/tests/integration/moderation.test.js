const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

describe("US-12 - Admin Moderation & Account Suspension", () => {
  const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
  const STUDENT_ID = "00000000-0000-0000-0000-000000000002";
  const LISTING_ID = "00000000-0000-0000-0000-000000000003";

  const ADMIN_EMAIL = "admin.mod@lakeheadu.ca";
  const ADMIN_PASSWORD = "Password123!";

  beforeAll(async () => {
    // 1. Clean up existing records using correct column 'reported_listing_id'
    await db.query(`DELETE FROM reports WHERE reported_listing_id = $1;`, [
      LISTING_ID,
    ]);
    await db.query(`DELETE FROM listings WHERE id = $1;`, [LISTING_ID]);
    await db.query(`DELETE FROM users WHERE id IN ($1, $2) OR email = $3;`, [
      ADMIN_ID,
      STUDENT_ID,
      ADMIN_EMAIL,
    ]);

    // 2. Hash password for admin login
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // 3. Insert test users
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES 
        ($1, $2, $3, 'admin', 'active', TRUE),
        ($4, 'violator@lakeheadu.ca', $3, 'student', 'active', TRUE);
    `,
      [ADMIN_ID, ADMIN_EMAIL, passwordHash, STUDENT_ID],
    );

    // 4. Insert test listing
    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description, status)
      VALUES ($1, $2, 'Inappropriate Item', 'COMP-1111', 'Good', 10.00, 'Agora', 'Desc', 'active');
    `,
      [LISTING_ID, STUDENT_ID],
    );
  });

  afterAll(async () => {
    await db.query(`DELETE FROM reports WHERE reported_listing_id = $1;`, [
      LISTING_ID,
    ]);
    await db.query(`DELETE FROM listings WHERE id = $1;`, [LISTING_ID]);
    await db.query(`DELETE FROM users WHERE id IN ($1, $2) OR email = $3;`, [
      ADMIN_ID,
      STUDENT_ID,
      ADMIN_EMAIL,
    ]);
  });

  it("should block unauthenticated access to admin endpoints", async () => {
    const res = await request(app).get("/api/admin/reports");
    expect(res.statusCode).toBe(401);
  });

  it("should allow admin to remove a listing when authenticated", async () => {
    const agent = request.agent(app);

    // Log in as admin to establish session cookie
    const loginRes = await agent.post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(loginRes.statusCode).toBe(200);

    // Perform listing removal request
    const res = await agent
      .patch(`/api/admin/listings/${LISTING_ID}/remove`)
      .send({ reason: "Inappropriate content" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});
