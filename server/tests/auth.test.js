const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");
const { sendVerificationEmail } = require("../src/config/mailer");

// Capture confirmation emails instead of sending them through Gmail
jest.mock("../src/config/mailer");

// The confirmation link from the most recent email sent to this address
function lastVerificationLink(email) {
  const calls = sendVerificationEmail.mock.calls.filter(([to]) => to === email);
  return new URL(calls[calls.length - 1][2]);
}

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
    expect(response.body.message).toMatch(/confirmation link/i);
    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user.email).toBe(testUserEmail);
    expect(response.body.user.role).toBe("student");
    expect(response.body.user.status).toBe("active");
    expect(response.body.user.email_verified).toBe(false);
    // First name is trimmed before it is stored
    expect(response.body.user.first_name).toBe(testFirstName);
    // Ensure password hash is not exposed in the response
    expect(response.body.user).not.toHaveProperty("password_hash");

    // A confirmation link was emailed to the new student
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      testUserEmail,
      testFirstName,
      expect.stringContaining("/api/auth/verify-email?token="),
    );
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

describe("Email confirmation (US-01)", () => {
  it("blocks login until the email is confirmed and emails a fresh link", async () => {
    const firstLink = lastVerificationLink(testUserEmail);

    const response = await request(app).post("/api/auth/login").send({
      email: testUserEmail,
      password: testPassword,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/confirm your email/i);
    expect(response.headers["set-cookie"]).toBeUndefined();

    // The new link replaces the old one
    const newLink = lastVerificationLink(testUserEmail);
    expect(newLink.href).not.toBe(firstLink.href);

    const oldLinkRes = await request(app).get(
      firstLink.pathname + firstLink.search,
    );
    expect(oldLinkRes.status).toBe(302);
    expect(oldLinkRes.headers.location).toMatch(/\?verified=invalid$/);
  });

  it("rejects a malformed confirmation link", async () => {
    const response = await request(app).get(
      "/api/auth/verify-email?token=not-a-real-token",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/\?verified=invalid$/);
  });

  it("confirms the email from the emailed link, which then stops working", async () => {
    const link = lastVerificationLink(testUserEmail);

    const response = await request(app).get(link.pathname + link.search);

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/\?verified=success$/);

    const { rows } = await pool.query(
      `SELECT email_verified, email_verification_token_hash
       FROM users WHERE email = $1`,
      [testUserEmail],
    );
    expect(rows[0].email_verified).toBe(true);
    expect(rows[0].email_verification_token_hash).toBeNull();

    const reuseRes = await request(app).get(link.pathname + link.search);
    expect(reuseRes.headers.location).toMatch(/\?verified=invalid$/);
  });

  it("does not create the account if the confirmation email can't be sent", async () => {
    const email = `test_mail_fail_${Date.now()}@lakeheadu.ca`;
    sendVerificationEmail.mockRejectedValueOnce(new Error("SMTP down"));
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password: testPassword, first_name: testFirstName });

    expect(response.status).toBe(502);

    const { rows } = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email,
    ]);
    expect(rows).toHaveLength(0);
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
