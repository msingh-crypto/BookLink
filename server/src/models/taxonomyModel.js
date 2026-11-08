const db = require("../config/db");

// Categories
async function getAllCategories(includeInactive = false) {
  const query = includeInactive
    ? `SELECT * FROM categories ORDER BY name ASC;`
    : `SELECT * FROM categories WHERE is_active = true ORDER BY name ASC;`;
  const { rows } = await db.query(query);
  return rows;
}

async function createCategory(name, code) {
  const query = `
    INSERT INTO categories (name, code, is_active)
    VALUES ($1, $2, true)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [name, code]);
  return rows[0];
}

async function updateCategory(id, { name, code, is_active }) {
  const query = `
    UPDATE categories
    SET name = COALESCE($1, name),
        code = COALESCE($2, code),
        is_active = COALESCE($3, is_active)
    WHERE id = $4
    RETURNING *;
  `;
  const { rows } = await db.query(query, [name, code, is_active, id]);
  return rows[0];
}

// Departments
async function getAllDepartments(includeInactive = false) {
  const query = includeInactive
    ? `SELECT * FROM departments ORDER BY code ASC;`
    : `SELECT * FROM departments WHERE is_active = true ORDER BY code ASC;`;
  const { rows } = await db.query(query);
  return rows;
}

async function createDepartment(code, name) {
  const query = `
    INSERT INTO departments (code, name, is_active)
    VALUES ($1, $2, true)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [code, name]);
  return rows[0];
}

async function updateDepartment(id, { code, name, is_active }) {
  const query = `
    UPDATE departments
    SET code = COALESCE($1, code),
        name = COALESCE($2, name),
        is_active = COALESCE($3, is_active)
    WHERE id = $4
    RETURNING *;
  `;
  const { rows } = await db.query(query, [code, name, is_active, id]);
  return rows[0];
}

// User Role Management
async function updateUserRole(userId, newRole) {
  const query = `
    UPDATE users
    SET role = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, email, role, status;
  `;
  const { rows } = await db.query(query, [newRole, userId]);
  return rows[0];
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  updateUserRole,
};
