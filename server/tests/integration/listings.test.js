const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/config/db");

const TEST_SELLER_ID = "11111111-1111-1111-1111-111111111111";

describe("POST /api/listings - Create Textbook Listing", () => {
  beforeAll(async () => {
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status)
      VALUES ($1, 'test.seller@lakeheadu.ca', 'hashedpassword', 'student', 'active')
      ON CONFLICT (id) DO NOTHING;
    `,
      [TEST_SELLER_ID],
    );
  });

  afterAll(async () => {
    await db.query(`DELETE FROM listings WHERE seller_id = $1;`, [
      TEST_SELLER_ID,
    ]);
    await db.query(`DELETE FROM users WHERE id = $1;`, [TEST_SELLER_ID]);

    if (db.pool) {
      await db.pool.end();
    }
  });

  it("should return 400 if mandatory fields are missing", async () => {
    const invalidPayload = {
      title: "Intro to Computer Science",
      price: 45.0,
    };

    const res = await request(app).post("/api/listings").send(invalidPayload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 if price is negative", async () => {
    const invalidPricePayload = {
      seller_id: TEST_SELLER_ID,
      title: "Intro to Computer Science",
      course_code: "COMP-1411",
      edition: "3rd",
      condition: "Good",
      price: -10.0,
      meetup_zone: "Agora",
      description: "Barely used book",
    };

    const res = await request(app)
      .post("/api/listings")
      .send(invalidPricePayload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/price/i);
  });

  it("should create a listing successfully when given valid inputs", async () => {
    const validPayload = {
      seller_id: TEST_SELLER_ID,
      title: "Intro to Computer Science",
      isbn: "9780134670942",
      course_code: "COMP-1411",
      edition: "3rd Edition",
      condition: "Good",
      price: 45.0,
      meetup_zone: "Agora",
      description: "Used for COMP-1411 last term. Clean condition.",
    };

    const res = await request(app).post("/api/listings").send(validPayload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe(validPayload.title);
    expect(res.body.status).toBe("active");
  });
});
