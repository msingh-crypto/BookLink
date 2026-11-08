const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/config/db");

describe("US-13: Manage Roles, Permissions and Taxonomy Integration Tests", () => {
  let targetUserId;

  beforeAll(async () => {
    // 1. Ensure admin user exists
    await db.query(`
      INSERT INTO users (email, password_hash, role, status)
      VALUES ('admin.test@lakeheadu.ca', 'hash', 'admin', 'active')
      ON CONFLICT (email) DO UPDATE SET role = 'admin';
    `);

    // 2. Student user to promote
    const studentRes = await db.query(`
      INSERT INTO users (email, password_hash, role, status)
      VALUES ('student.target@lakeheadu.ca', 'hash', 'student', 'active')
      ON CONFLICT (email) DO UPDATE SET role = 'student' RETURNING id;
    `);
    targetUserId = studentRes.rows[0].id;
  });

  afterAll(async () => {
    await db.query(
      `DELETE FROM users WHERE email IN ('admin.test@lakeheadu.ca', 'student.target@lakeheadu.ca')`,
    );
    if (db.pool) await db.pool.end();
  });

  describe("1. Role Promotion & Delegation (RBAC)", () => {
    it("should reject unauthenticated users attempting to promote roles (401)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUserId}/role`)
        .send({ role: "moderator" });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("2. Dynamic Taxonomy Endpoints", () => {
    it("GET /api/taxonomy/categories - should return list of active categories", async () => {
      const res = await request(app).get("/api/taxonomy/categories");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/taxonomy/departments - should return list of active departments", async () => {
      const res = await request(app).get("/api/taxonomy/departments");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
