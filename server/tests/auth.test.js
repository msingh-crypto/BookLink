const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("POST /api/auth/register (US-01: Student Registration)", () => {
  const testUserEmail = `test_student_${Date.now()}@lakeheadu.ca`;
  const testPassword = "Password123!";

  afterAll(async () => {
    // Clean up created test user from database
    await pool.query("DELETE FROM users WHERE email = $1", [testUserEmail]);
    await pool.end();
  });

  it("should successfully register an account with a valid Lakehead email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: testUserEmail,
      password: testPassword,
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
    // Ensure password hash is not exposed in the response
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("should reject registration if the email does not end with @lakeheadu.ca", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "imposter@gmail.com",
      password: testPassword,
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

  it("should reject duplicate registration for an existing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: testUserEmail,
      password: "AnotherPassword456!",
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("already exists");
  });
});
