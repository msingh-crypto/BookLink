const pool = require("../../src/config/db");

describe("Database Connection Pool", () => {
  afterAll(async () => {
    // Close pool connections after tests finish
    await pool.end();
  });

  it("should have a valid pool configuration loaded", () => {
    // Verifies that either a connectionString or individual host option exists
    const hasConnectionString = Boolean(pool.options.connectionString);
    const hasHost = Boolean(pool.options.host);

    expect(hasConnectionString || hasHost).toBe(true);
  });

  it("should successfully query the database version", async () => {
    const res = await pool.query("SELECT version()");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toHaveProperty("version");
  });
});
