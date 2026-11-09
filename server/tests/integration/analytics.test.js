const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const db = require("../../src/config/db");

describe("US-14: Platform Analytics & Sales Reporting API", () => {
  const ADMIN_ID = "00000000-0000-0000-0000-000000000010";
  const STUDENT_ID = "00000000-0000-0000-0000-000000000020";

  const ADMIN_EMAIL = "analytics.admin@lakeheadu.ca";
  const STUDENT_EMAIL = "student.user@lakeheadu.ca";
  const PASSWORD = "Password123!";

  beforeAll(async () => {
    // Cleanup prior test artifacts
    await db.query(
      `DELETE FROM users WHERE id IN ($1, $2) OR email IN ($3, $4);`,
      [ADMIN_ID, STUDENT_ID, ADMIN_EMAIL, STUDENT_EMAIL],
    );

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Insert test users with verified email status to bypass mailer execution
    await db.query(
      `
      INSERT INTO users (id, email, password_hash, role, status, email_verified)
      VALUES 
        ($1, $2, $3, 'admin', 'active', true),
        ($4, $5, $3, 'student', 'active', true)
      ON CONFLICT (id) DO UPDATE SET 
        status = 'active', 
        email_verified = true,
        role = EXCLUDED.role;
    `,
      [ADMIN_ID, ADMIN_EMAIL, passwordHash, STUDENT_ID, STUDENT_EMAIL],
    );
  });

  afterAll(async () => {
    await db.query(
      `DELETE FROM users WHERE id IN ($1, $2) OR email IN ($3, $4);`,
      [ADMIN_ID, STUDENT_ID, ADMIN_EMAIL, STUDENT_EMAIL],
    );
  });

  it("GET /api/admin/analytics - should block unauthenticated requests", async () => {
    const res = await request(app).get("/api/admin/analytics");
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/admin/analytics - should block non-admin student users", async () => {
    const studentAgent = request.agent(app);
    const loginRes = await studentAgent.post("/api/auth/login").send({
      email: STUDENT_EMAIL,
      password: PASSWORD,
    });
    expect(loginRes.statusCode).toBe(200);

    const res = await studentAgent.get("/api/admin/analytics");
    expect(res.statusCode).toBe(403);
  });

  it("GET /api/admin/analytics - should return summary totals and time series metrics for admin", async () => {
    const adminAgent = request.agent(app);
    const loginRes = await adminAgent.post("/api/auth/login").send({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    expect(loginRes.statusCode).toBe(200);

    const res = await adminAgent.get("/api/admin/analytics?range=monthly");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totals");
    expect(res.body).toHaveProperty("timeSeries");
    expect(res.body.totals).toHaveProperty("total_registered_users");
    expect(res.body.totals).toHaveProperty("total_active_listings");
    expect(res.body.totals).toHaveProperty("total_items_sold");
    expect(Array.isArray(res.body.timeSeries)).toBe(true);
  });
});
