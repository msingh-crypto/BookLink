const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

// Dedicated IDs for the US-05 favourites suite
const FAV_SELLER_ID = "d4444444-4444-4444-4444-444444444444";
const FAV_BUYER_ID = "e5555555-5555-5555-5555-555555555555";
const FAV_LISTING_ID = "f6666666-6666-6666-6666-666666666666";
const MISSING_LISTING_ID = "f7777777-7777-7777-7777-777777777777";
const SELLER_EMAIL = "favourites.seller@lakeheadu.ca";
const BUYER_EMAIL = "favourites.buyer@lakeheadu.ca";
const TEST_PASSWORD = "Password123!";

async function cleanUp() {
  await db.query(`DELETE FROM favourites WHERE user_id = $1;`, [FAV_BUYER_ID]);
  await db.query(`DELETE FROM listings WHERE id = $1;`, [FAV_LISTING_ID]);
  await db.query(`DELETE FROM users WHERE id = ANY($1) OR email = ANY($2);`, [
    [FAV_SELLER_ID, FAV_BUYER_ID],
    [SELLER_EMAIL, BUYER_EMAIL],
  ]);
}

describe("Favourites API (US-05)", () => {
  const agent = request.agent(app);

  beforeAll(async () => {
    await cleanUp();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE),
             ($4, $5, $3, 'student', 'active', TRUE);
    `,
      [FAV_SELLER_ID, SELLER_EMAIL, passwordHash, FAV_BUYER_ID, BUYER_EMAIL],
    );

    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description)
      VALUES ($1, $2, 'Operating Systems', 'COMP-3511', 'Good', 30.00, 'Agora', 'Highlighted');
    `,
      [FAV_LISTING_ID, FAV_SELLER_ID],
    );

    const loginRes = await agent.post("/api/auth/login").send({
      email: BUYER_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(loginRes.statusCode).toBe(200);
  });

  afterAll(async () => {
    await cleanUp();
  });

  describe("when unauthenticated", () => {
    it("returns 401 for GET /api/favourites", async () => {
      const res = await request(app).get("/api/favourites");
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for POST /api/favourites/:listingId", async () => {
      const res = await request(app).post(`/api/favourites/${FAV_LISTING_ID}`);
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for DELETE /api/favourites/:listingId", async () => {
      const res = await request(app).delete(
        `/api/favourites/${FAV_LISTING_ID}`,
      );
      expect(res.statusCode).toBe(401);
    });
  });

  // These run in order: add -> list -> remove, sharing the logged-in agent.
  describe("when authenticated", () => {
    it("starts with an empty favourites list", async () => {
      const res = await agent.get("/api/favourites");

      expect(res.statusCode).toBe(200);
      expect(res.body.listings).toEqual([]);
      expect(res.body.favouriteIds).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it("adds a favourite and returns 201", async () => {
      const res = await agent.post(`/api/favourites/${FAV_LISTING_ID}`);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("message");
    });

    it("treats adding the same favourite twice as a no-op, not an error", async () => {
      const res = await agent.post(`/api/favourites/${FAV_LISTING_ID}`);
      expect(res.statusCode).toBe(201);

      const { rows } = await db.query(
        `SELECT 1 FROM favourites WHERE user_id = $1 AND listing_id = $2;`,
        [FAV_BUYER_ID, FAV_LISTING_ID],
      );
      expect(rows).toHaveLength(1);
    });

    it("lists the favourited listing with its details", async () => {
      const res = await agent.get("/api/favourites");

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.favouriteIds).toContain(FAV_LISTING_ID);
      expect(res.body.listings[0]).toMatchObject({
        id: FAV_LISTING_ID,
        title: "Operating Systems",
        course_code: "COMP-3511",
      });
      expect(Array.isArray(res.body.listings[0].photos)).toBe(true);
    });

    it("does not list favourites that are no longer active", async () => {
      await db.query(`UPDATE listings SET status = 'sold' WHERE id = $1;`, [
        FAV_LISTING_ID,
      ]);

      const res = await agent.get("/api/favourites");
      expect(res.statusCode).toBe(200);
      expect(res.body.favouriteIds).not.toContain(FAV_LISTING_ID);

      await db.query(`UPDATE listings SET status = 'active' WHERE id = $1;`, [
        FAV_LISTING_ID,
      ]);
    });

    it("removes a favourite and returns 200", async () => {
      const res = await agent.delete(`/api/favourites/${FAV_LISTING_ID}`);
      expect(res.statusCode).toBe(200);

      const listRes = await agent.get("/api/favourites");
      expect(listRes.body.favouriteIds).not.toContain(FAV_LISTING_ID);
    });

    it("returns 200 when removing a favourite that does not exist", async () => {
      const res = await agent.delete(`/api/favourites/${FAV_LISTING_ID}`);
      expect(res.statusCode).toBe(200);
    });

    it("returns 400 for a malformed listing id on add", async () => {
      const res = await agent.post("/api/favourites/not-a-uuid");
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for a malformed listing id on remove", async () => {
      const res = await agent.delete("/api/favourites/not-a-uuid");
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when favouriting a listing that does not exist", async () => {
      const res = await agent.post(`/api/favourites/${MISSING_LISTING_ID}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
