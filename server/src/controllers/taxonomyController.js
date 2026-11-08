const taxonomyModel = require("../models/taxonomyModel");

async function getCategories(req, res) {
  try {
    const categories = await taxonomyModel.getAllCategories(
      req.query.includeInactive === "true",
    );
    return res.status(200).json(categories);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch categories." });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await taxonomyModel.getAllDepartments(
      req.query.includeInactive === "true",
    );
    return res.status(200).json(departments);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch departments." });
  }
}

async function handleCreateCategory(req, res) {
  try {
    const { name, code } = req.body;
    if (!name || !code)
      return res.status(400).json({ error: "Name and code are required." });
    const category = await taxonomyModel.createCategory(name, code);
    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleUpdateCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await taxonomyModel.updateCategory(id, req.body);
    if (!category)
      return res.status(404).json({ error: "Category not found." });
    return res.status(200).json(category);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleCreateDepartment(req, res) {
  try {
    const { code, name } = req.body;
    if (!code || !name)
      return res.status(400).json({ error: "Code and name are required." });
    const dept = await taxonomyModel.createDepartment(code, name);
    return res.status(201).json(dept);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleUpdateDepartment(req, res) {
  try {
    const { id } = req.params;
    const dept = await taxonomyModel.updateDepartment(id, req.body);
    if (!dept) return res.status(404).json({ error: "Department not found." });
    return res.status(200).json(dept);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handlePromoteUser(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["student", "moderator", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const updatedUser = await taxonomyModel.updateUserRole(id, role);
    if (!updatedUser) return res.status(404).json({ error: "User not found." });

    return res
      .status(200)
      .json({ message: `User role updated to ${role}.`, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getCategories,
  getDepartments,
  handleCreateCategory,
  handleUpdateCategory,
  handleCreateDepartment,
  handleUpdateDepartment,
  handlePromoteUser,
};
