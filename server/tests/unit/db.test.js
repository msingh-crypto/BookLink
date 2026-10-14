// tests/unit/db.test.js
const { pool } = require("../../src/config/db");

describe("Database Connection Pool", () => {
  afterAll(async () => {
    // Safely drain and close pool connections created in this test file
    if (pool && typeof pool.end === "function") {
      await pool.end();
    }
  });

  it("should have a valid pool configuration loaded", () => {
    const options = pool?.options || {};
    const hasConnectionString = Boolean(
      options.connectionString || process.env.DATABASE_URL,
    );
    const hasHost = Boolean(
      options.host || process.env.PGHOST || process.env.DB_HOST,
    );

    expect(hasConnectionString || hasHost).toBe(true);
  });

  it("should successfully query the database version", async () => {
    const res = await pool.query("SELECT version()");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toHaveProperty("version");
  });
});
