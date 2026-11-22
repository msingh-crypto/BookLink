const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/config/db");

const TEST_SELLER_ID = "22222222-2222-2222-2222-222222222222";
const TEST_SELLER_EMAIL = "test.viewer.seller@lakeheadu.ca";

const insertListing = async (overrides = {}) => {
  const listing = {
    category_id: null,
    department_id: null,
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
       (seller_id, category_id, title, course_code, condition, price, meetup_zone, description, status, created_at, department_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_TIMESTAMP), $11)
     RETURNING id;`,
    [
      TEST_SELLER_ID,
      listing.category_id,
      listing.title,
      listing.course_code,
      listing.condition,
      listing.price,
      listing.meetup_zone,
      listing.description,
      listing.status,
      listing.created_at || null,
      listing.department_id,
    ],
  );
  return rows[0].id;
};

describe("GET /api/listings - View Current Listings", () => {
  let olderId;
  let newerId;
  let soldId;
  let compGoodCheapId;
  let compGoodExpensiveId;
  let busiFairId;

  beforeAll(async () => {
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, status)
       VALUES ($1, $2, 'hashedpassword', 'student', 'active')
       ON CONFLICT (id) DO NOTHING;`,
      [TEST_SELLER_ID, TEST_SELLER_EMAIL],
    );

    await db.query(
      `INSERT INTO categories (name, code)
       VALUES ('Computer Science', 'COMP'), ('Business Administration', 'BUSI')
       ON CONFLICT (code) DO NOTHING;`,
    );

    const { rows: catRows } = await db.query(
      `SELECT id, code FROM categories WHERE code IN ('COMP', 'BUSI');`,
    );
    const compId = catRows.find((c) => c.code === "COMP")?.id || null;
    const busiId = catRows.find((c) => c.code === "BUSI")?.id || null;

    // US-13: Department filters use department IDs independently of categories.
    await db.query(`
      INSERT INTO departments (code, name)
      VALUES
        ('COMP', 'Computer Science'),
        ('BUSI', 'Business & Economics')
      ON CONFLICT (code) DO NOTHING;
    `);

    const { rows: departmentRows } = await db.query(`
      SELECT id, code
      FROM departments
      WHERE code IN ('COMP', 'BUSI');
    `);

    const compDepartmentId = departmentRows.find(
      (department) => department.code === "COMP",
    ).id;

    const busiDepartmentId = departmentRows.find(
      (department) => department.code === "BUSI",
    ).id;

    olderId = await insertListing({
      title: "Older Listing",
      created_at: "2026-01-01T00:00:00Z",
    });
    newerId = await insertListing({
      title: "Newer Listing",
      created_at: "2026-02-01T00:00:00Z",
    });
    soldId = await insertListing({ title: "Sold Listing", status: "sold" });

    compGoodCheapId = await insertListing({
      category_id: compId,
      department_id: compDepartmentId,
      title: "Algorithms Cheap",
      course_code: "COMP-3013",
      condition: "Good",
      price: 35,
    });
    compGoodExpensiveId = await insertListing({
      category_id: compId,
      department_id: compDepartmentId,
      title: "Algorithms Expensive",
      course_code: "COMP-3013",
      condition: "Good",
      price: 85,
    });
    busiFairId = await insertListing({
      category_id: busiId,
      department_id: busiDepartmentId,
      title: "Intro Business",
      course_code: "BUSI-1012",
      condition: "Fair",
      price: 50,
    });

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

  it("returns 400 for an invalid condition filter", async () => {
    const res = await request(app).get("/api/listings?condition=Broken");
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Invalid condition filter.");
  });

  it("filters by department, condition, and courseCode together with sorting", async () => {
    const res = await request(app).get(
      "/api/listings?department=COMP&condition=Good&courseCode=COMP%203013&sortBy=price&sortOrder=asc",
    );

    expect(res.statusCode).toEqual(200);
    const ids = res.body.listings.map((l) => l.id);
    expect(ids).toContain(compGoodCheapId);
    expect(ids).toContain(compGoodExpensiveId);
    expect(ids).not.toContain(busiFairId);
    expect(ids.indexOf(compGoodCheapId)).toBeLessThan(
      ids.indexOf(compGoodExpensiveId),
    );
  });

  it("normalizes hyphens and spaces in courseCode filter", async () => {
    const res = await request(app).get("/api/listings?courseCode=comp%203013");

    expect(res.statusCode).toEqual(200);
    const ids = res.body.listings.map((l) => l.id);
    expect(ids).toContain(compGoodCheapId);
    expect(ids).toContain(compGoodExpensiveId);
    expect(ids).not.toContain(busiFairId);
  });
  // US-13: Reject malformed category filters.
  it("returns 400 for an invalid category filter", async () => {
    const res = await request(app).get("/api/listings?category=abc");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("category must be a positive integer ID.");
  });

  // US-13: Category combines with department and other active filters.
  it("combines category, department, condition, and course filters", async () => {
    const { rows } = await db.query(
      "SELECT category_id FROM listings WHERE id = $1;",
      [compGoodCheapId],
    );
    const categoryId = rows[0].category_id;

    const res = await request(app).get("/api/listings").query({
      category: categoryId,
      department: "COMP",
      condition: "Good",
      courseCode: "COMP 3013",
      sortBy: "price",
      sortOrder: "asc",
      limit: 100,
    });

    expect(res.statusCode).toBe(200);

    const ids = res.body.listings.map((listing) => listing.id);
    expect(ids).toContain(compGoodCheapId);
    expect(ids).toContain(compGoodExpensiveId);
    expect(ids).not.toContain(busiFairId);
    expect(ids.indexOf(compGoodCheapId)).toBeLessThan(
      ids.indexOf(compGoodExpensiveId),
    );

    for (const listing of res.body.listings) {
      expect(listing.category_id).toBe(categoryId);
      expect(listing.department_code).toBe("COMP");
      expect(listing.condition).toBe("Good");
    }

    // The same category with a different department must exclude these books.
    const differentDepartment = await request(app).get("/api/listings").query({
      category: categoryId,
      department: "BUSI",
      limit: 100,
    });

    expect(differentDepartment.statusCode).toBe(200);

    const otherIds = differentDepartment.body.listings.map(
      (listing) => listing.id,
    );
    expect(otherIds).not.toContain(compGoodCheapId);
    expect(otherIds).not.toContain(compGoodExpensiveId);
  });
});
