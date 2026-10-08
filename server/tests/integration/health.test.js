const request = require("supertest");
const app = require("../../src/app");

describe("GET /api/health", () => {
  it("should return 200 OK with status and timestamp", async () => {
    const response = await request(app).get("/api/health");

    // Assert HTTP status code
    expect(response.status).toBe(200);

    // Assert response structure and types
    expect(response.body).toHaveProperty("status", "OK");
    expect(response.body).toHaveProperty("timestamp");
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("should serve Swagger API documentation at /api-docs/", async () => {
    const response = await request(app).get("/api-docs/");

    // Assert that Swagger UI returns HTML (200 OK or 301 Redirect)
    expect([200, 301]).toContain(response.status);
  });
});
