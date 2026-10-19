const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/config/db");

const TEST_SELLER_ID = "22222222-2222-2222-2222-222222222222";
const TEST_SELLER_EMAIL = "test.viewer.seller@lakeheadu.ca";

const insertListing = async (overrides = {}) => {
  const listing = {
    title: "Calculus: Early Transcendentals",
    course_code: "MATH-1410",
    condition: "Good",
    price: 60,
    meetup_zone: "Library",
    description: "Some highlighting in chapter 3.",
    status: "active",
    ...overrides,
  };

  const { rows } = await db.query(
    `INSERT INTO listings
       (seller_id, title, course_code, condition, price, meetup_zone, description, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))
     RETURNING id;`,
    [
      TEST_SELLER_ID,
      listing.title,
      listing.course_code,
      listing.condition,
      listing.price,
      listing.meetup_zone,
      listing.description,
      listing.status,
      listing.created_at || null,
    ],
  );
  return rows[0].id;
};

describe("GET /api/listings - View Current Listings", () => {
  let olderId;
  let newerId;
  let soldId;

  beforeAll(async () => {
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, status)
       VALUES ($1, $2, 'hashedpassword', 'student', 'active')
       ON CONFLICT (id) DO NOTHING;`,
      [TEST_SELLER_ID, TEST_SELLER_EMAIL],
    );

    olderId = await insertListing({
      title: "Older Listing",
      created_at: "2026-01-01T00:00:00Z",
    });
    newerId = await insertListing({
      title: "Newer Listing",
      created_at: "2026-02-01T00:00:00Z",
    });
    soldId = await insertListing({ title: "Sold Listing", status: "sold" });

    await db.query(
      `INSERT INTO listing_photos (listing_id, image_url) VALUES ($1, $2);`,
      [newerId, "https://example.com/photo.jpg"],
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

  it("returns active listings newest first with photos", async () => {
    const res = await request(app).get("/api/listings?limit=100");

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.listings)).toBe(true);

    const ids = res.body.listings.map((l) => l.id);
    expect(ids).toContain(olderId);
    expect(ids).toContain(newerId);
    expect(ids.indexOf(newerId)).toBeLessThan(ids.indexOf(olderId));

    const newer = res.body.listings.find((l) => l.id === newerId);
    expect(newer.photos).toEqual(["https://example.com/photo.jpg"]);
    expect(newer.price).toBe(60);

    const older = res.body.listings.find((l) => l.id === olderId);
    expect(older.photos).toEqual([]);
  });

  it("does not return sold or removed listings", async () => {
    const res = await request(app).get("/api/listings?limit=100");
    const ids = res.body.listings.map((l) => l.id);
    expect(ids).not.toContain(soldId);
  });

  it("never exposes seller contact information", async () => {
    const res = await request(app).get("/api/listings?limit=100");
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(TEST_SELLER_EMAIL);
    expect(body).not.toContain("password_hash");
  });

  it("supports pagination with limit and offset", async () => {
    const res = await request(app).get("/api/listings?limit=1&offset=0");

    expect(res.statusCode).toEqual(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(0);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it("returns 400 for an invalid limit", async () => {
    const res = await request(app).get("/api/listings?limit=abc");
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/limit/i);
  });

  it("returns 400 for a limit above the maximum", async () => {
    const res = await request(app).get("/api/listings?limit=1000");
    expect(res.statusCode).toEqual(400);
  });

  it("returns a single active listing by id", async () => {
    const res = await request(app).get(`/api/listings/${newerId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.id).toBe(newerId);
    expect(res.body.title).toBe("Newer Listing");
    expect(res.body.photos).toHaveLength(1);
  });

  it("returns 404 for a sold listing by id", async () => {
    const res = await request(app).get(`/api/listings/${soldId}`);
    expect(res.statusCode).toEqual(404);
  });

  it("returns 404 for a malformed id instead of a server error", async () => {
    const res = await request(app).get("/api/listings/not-a-uuid");
    expect(res.statusCode).toEqual(404);
  });
});
