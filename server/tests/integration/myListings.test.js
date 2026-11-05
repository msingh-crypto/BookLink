const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

// Dedicated IDs for the US-07 seller listing management suite
const OWNER_ID = "a7070707-0000-4000-8000-000000000001";
const OTHER_ID = "a7070707-0000-4000-8000-000000000002";
const ACTIVE_LISTING_ID = "b7070707-0000-4000-8000-000000000001";
const SOLD_LISTING_ID = "b7070707-0000-4000-8000-000000000002";
const REMOVED_LISTING_ID = "b7070707-0000-4000-8000-000000000003";
const MODERATED_LISTING_ID = "b7070707-0000-4000-8000-000000000004";
const OTHER_LISTING_ID = "b7070707-0000-4000-8000-000000000005";
const MISSING_LISTING_ID = "b7070707-0000-4000-8000-000000000099";
const OWNER_EMAIL = "mylistings.owner@lakeheadu.ca";
const OTHER_EMAIL = "mylistings.other@lakeheadu.ca";
const TEST_PASSWORD = "Password123!";

const ALL_LISTING_IDS = [
  ACTIVE_LISTING_ID,
  SOLD_LISTING_ID,
  REMOVED_LISTING_ID,
  MODERATED_LISTING_ID,
  OTHER_LISTING_ID,
];

async function cleanUp() {
  await db.query(`DELETE FROM reports WHERE reported_listing_id = ANY($1);`, [
    ALL_LISTING_IDS,
  ]);
  await db.query(`DELETE FROM listings WHERE id = ANY($1);`, [ALL_LISTING_IDS]);
  await db.query(`DELETE FROM users WHERE id = ANY($1) OR email = ANY($2);`, [
    [OWNER_ID, OTHER_ID],
    [OWNER_EMAIL, OTHER_EMAIL],
  ]);
}

async function statusOf(listingId) {
  const { rows } = await db.query(
    `SELECT status FROM listings WHERE id = $1;`,
    [listingId],
  );
  return rows[0].status;
}

describe("Seller listing management API (US-07)", () => {
  const ownerAgent = request.agent(app);
  const otherAgent = request.agent(app);

  beforeAll(async () => {
    await cleanUp();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES ($1, $2, $3, 'student', 'active', TRUE),
             ($4, $5, $3, 'student', 'active', TRUE);
    `,
      [OWNER_ID, OWNER_EMAIL, passwordHash, OTHER_ID, OTHER_EMAIL],
    );

    // Staggered created_at so the newest-first order is deterministic
    await db.query(
      `
      INSERT INTO listings (id, seller_id, title, course_code, condition, price, meetup_zone, description, status, created_at)
      VALUES
        ($1, $6, 'Owner Active Book', 'COMP-1411', 'Good', 20.00, 'Agora', 'Desc', 'active', NOW() - INTERVAL '1 hour'),
        ($2, $6, 'Owner Sold Book', 'COMP-1412', 'Fair', 15.00, 'Library', 'Desc', 'sold', NOW() - INTERVAL '2 hours'),
        ($3, $6, 'Owner Removed Book', 'COMP-1413', 'Poor', 5.00, 'Agora', 'Desc', 'removed', NOW() - INTERVAL '3 hours'),
        ($4, $6, 'Owner Moderated Book', 'COMP-1414', 'Good', 10.00, 'Agora', 'Desc', 'removed', NOW() - INTERVAL '4 hours'),
        ($5, $7, 'Someone Else''s Book', 'COMP-1415', 'New', 50.00, 'Agora', 'Desc', 'active', NOW());
    `,
      [
        ACTIVE_LISTING_ID,
        SOLD_LISTING_ID,
        REMOVED_LISTING_ID,
        MODERATED_LISTING_ID,
        OTHER_LISTING_ID,
        OWNER_ID,
        OTHER_ID,
      ],
    );

    // A report resolved by a moderator marks MODERATED_LISTING_ID as taken down
    await db.query(
      `
      INSERT INTO reports (reporter_id, reported_listing_id, reason_category, status)
      VALUES ($1, $2, 'Spam', 'action_taken');
    `,
      [OTHER_ID, MODERATED_LISTING_ID],
    );

    const ownerLogin = await ownerAgent.post("/api/auth/login").send({
      email: OWNER_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(ownerLogin.statusCode).toBe(200);

    const otherLogin = await otherAgent.post("/api/auth/login").send({
      email: OTHER_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(otherLogin.statusCode).toBe(200);
  });

  afterAll(async () => {
    await cleanUp();
  });

  describe("when unauthenticated", () => {
    it("returns 401 for GET /api/listings/mine", async () => {
      const res = await request(app).get("/api/listings/mine");
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for PATCH /api/listings/:id/status", async () => {
      const res = await request(app)
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "sold" });
      expect(res.statusCode).toBe(401);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("active");
    });
  });

  describe("GET /api/listings/mine", () => {
    it("returns only the session user's listings, in every status, newest first", async () => {
      const res = await ownerAgent.get("/api/listings/mine");

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(4);
      expect(res.body.listings.map((l) => l.id)).toEqual([
        ACTIVE_LISTING_ID,
        SOLD_LISTING_ID,
        REMOVED_LISTING_ID,
        MODERATED_LISTING_ID,
      ]);
      expect(res.body.listings.map((l) => l.status)).toEqual([
        "active",
        "sold",
        "removed",
        "removed",
      ]);
      expect(res.body.listings.every((l) => l.seller_id === OWNER_ID)).toBe(
        true,
      );
      expect(Array.isArray(res.body.listings[0].photos)).toBe(true);
    });

    it("flags listings that a moderator removed", async () => {
      const res = await ownerAgent.get("/api/listings/mine");
      const byId = Object.fromEntries(res.body.listings.map((l) => [l.id, l]));

      expect(byId[MODERATED_LISTING_ID].removed_by_moderator).toBe(true);
      expect(byId[REMOVED_LISTING_ID].removed_by_moderator).toBe(false);
      expect(byId[ACTIVE_LISTING_ID].removed_by_moderator).toBe(false);
    });

    it("ignores a client-supplied seller id", async () => {
      const res = await otherAgent.get(
        `/api/listings/mine?seller_id=${OWNER_ID}`,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.listings.map((l) => l.id)).toEqual([OTHER_LISTING_ID]);
    });

    it("does not leak seller contact details", async () => {
      const res = await ownerAgent.get("/api/listings/mine");
      expect(res.body.listings[0]).not.toHaveProperty("email");
    });
  });

  // These run in order and share the owner's listings.
  describe("PATCH /api/listings/:id/status", () => {
    it("lets the owner mark an active listing as sold", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "sold" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: ACTIVE_LISTING_ID,
        status: "sold",
      });
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("sold");
    });

    it("hides a sold listing from public browsing", async () => {
      const res = await request(app).get(`/api/listings/${ACTIVE_LISTING_ID}`);
      expect(res.statusCode).toBe(404);
    });

    it("lets the owner remove and then reactivate their own listing", async () => {
      const removeRes = await ownerAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "removed" });
      expect(removeRes.statusCode).toBe(200);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("removed");

      const activeRes = await ownerAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "active" });
      expect(activeRes.statusCode).toBe(200);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("active");

      const publicRes = await request(app).get(
        `/api/listings/${ACTIVE_LISTING_ID}`,
      );
      expect(publicRes.statusCode).toBe(200);
    });

    it("lets the owner relist a sold listing", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${SOLD_LISTING_ID}/status`)
        .send({ status: "active" });

      expect(res.statusCode).toBe(200);
      expect(await statusOf(SOLD_LISTING_ID)).toBe("active");
    });

    it("returns 403 when a non-owner tries to change a listing", async () => {
      const res = await otherAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "removed" });

      expect(res.statusCode).toBe(403);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("active");
    });

    it("ignores a client-supplied seller id in the body", async () => {
      const res = await otherAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "removed", seller_id: OWNER_ID });

      expect(res.statusCode).toBe(403);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("active");
    });

    it("returns 403 when the owner tries to undo a moderator removal", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${MODERATED_LISTING_ID}/status`)
        .send({ status: "active" });

      expect(res.statusCode).toBe(403);
      expect(await statusOf(MODERATED_LISTING_ID)).toBe("removed");
    });

    it("returns 400 for an unknown status", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({ status: "archived" });

      expect(res.statusCode).toBe(400);
      expect(await statusOf(ACTIVE_LISTING_ID)).toBe("active");
    });

    it("returns 400 when status is missing", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${ACTIVE_LISTING_ID}/status`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 for a listing that does not exist", async () => {
      const res = await ownerAgent
        .patch(`/api/listings/${MISSING_LISTING_ID}/status`)
        .send({ status: "sold" });

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 for a malformed listing id", async () => {
      const res = await ownerAgent
        .patch("/api/listings/not-a-uuid/status")
        .send({ status: "sold" });

      expect(res.statusCode).toBe(404);
    });
  });
});
