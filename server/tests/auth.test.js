const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

const testUserEmail = `test_student_${Date.now()}@lakeheadu.ca`;
const testPassword = "Password123!";
const testFirstName = "Taylor";

afterAll(async () => {
  // Clean up created test user (their user_profiles row cascades)
  await pool.query("DELETE FROM users WHERE email = $1", [testUserEmail]);
  if (app.close) {
    await app.close();
  }
});

describe("POST /api/auth/register (US-01: Student Registration)", () => {
  it("should successfully register an account with a valid Lakehead email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: testUserEmail,
        password: testPassword,
        first_name: `  ${testFirstName}  `,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Student account registered successfully.",
    );
    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user.email).toBe(testUserEmail);
    expect(response.body.user.role).toBe("student");
    expect(response.body.user.status).toBe("active");
    // First name is trimmed before it is stored
    expect(response.body.user.first_name).toBe(testFirstName);
    // Ensure password hash is not exposed in the response
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("should store the first name in user_profiles, matched by email", async () => {
    const { rows } = await pool.query(
      "SELECT first_name FROM user_profiles WHERE email = $1",
      [testUserEmail],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].first_name).toBe(testFirstName);
  });

  it("should reject registration if the email does not end with @lakeheadu.ca", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "imposter@gmail.com",
      password: testPassword,
      first_name: testFirstName,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("@lakeheadu.ca");
  });

  it("should reject registration if fields are missing", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "",
      password: "",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("should reject registration if the first name is missing or blank", async () => {
    const email = `test_no_name_${Date.now()}@lakeheadu.ca`;

    for (const first_name of [undefined, "   "]) {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email, password: testPassword, first_name });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/first name/i);
    }

    // No account should have been created
    const { rows } = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("should reject a first name longer than 50 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: `test_long_name_${Date.now()}@lakeheadu.ca`,
        password: testPassword,
        first_name: "a".repeat(51),
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/first name/i);
  });

  it("should reject duplicate registration for an existing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: testUserEmail,
      password: "AnotherPassword456!",
      first_name: "Someone",
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("already exists");
  });
});

describe("First name after login (US-02)", () => {
  it("returns the first name from login and from /api/auth/me", async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post("/api/auth/login").send({
      email: testUserEmail,
      password: testPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.first_name).toBe(testFirstName);

    const meRes = await agent.get("/api/auth/me");

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUserEmail);
    expect(meRes.body.user.first_name).toBe(testFirstName);
  });
});
