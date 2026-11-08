import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function AdminTaxonomyDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState("taxonomy"); // 'taxonomy' | 'roles'
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");

  // Department Form State
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");

  // Role Promotion State
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("moderator");
  const [roleMessage, setRoleMessage] = useState("");

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    setLoading(true);
    try {
      const [catRes, deptRes] = await Promise.all([
        fetch("/api/taxonomy/categories?includeInactive=true"),
        fetch("/api/taxonomy/departments?includeInactive=true"),
      ]);

      if (catRes.ok && deptRes.ok) {
        const catData = await catRes.json();
        const deptData = await deptRes.json();
        setCategories(catData);
        setDepartments(deptData);
      } else {
        setError("Failed to load taxonomy data.");
      }
    } catch (err) {
      setError("Network error while fetching taxonomy.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatCode) return;

    try {
      const res = await fetch("/api/admin/taxonomy/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, code: newCatCode }),
      });
      if (res.ok) {
        setNewCatName("");
        setNewCatCode("");
        fetchTaxonomy();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add category.");
      }
    } catch (err) {
      setError("Failed to add category.");
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptCode || !newDeptName) return;

    try {
      const res = await fetch("/api/admin/taxonomy/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newDeptCode, name: newDeptName }),
      });
      if (res.ok) {
        setNewDeptCode("");
        setNewDeptName("");
        fetchTaxonomy();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add department.");
      }
    } catch (err) {
      setError("Failed to add department.");
    }
  };

  const handleToggleCategoryActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/taxonomy/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) fetchTaxonomy();
    } catch (err) {
      setError("Failed to update category status.");
    }
  };

  const handleToggleDeptActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/taxonomy/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) fetchTaxonomy();
    } catch (err) {
      setError("Failed to update department status.");
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    setRoleMessage("");
    if (!targetUserId) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoleMessage(`Success: ${data.message}`);
        setTargetUserId("");
      } else {
        setRoleMessage(`Error: ${data.error || "Failed to update role."}`);
      }
    } catch (err) {
      setRoleMessage("Error updating role.");
    }
  };

  if (loading)
    return <div className="p-6 text-slate-600">Loading admin dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Admin Control Center
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("taxonomy")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "taxonomy"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Taxonomy Maintenance
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === "roles"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Role Delegation (RBAC)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {activeTab === "taxonomy" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Categories Management */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Categories</h2>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Category Name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Category Code"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value)}
                className="w-28 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add Category
              </button>
            </form>

            <ul className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-800">
                      {cat.name}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      ({cat.code})
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleCategoryActive(cat.id, cat.is_active)
                    }
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      cat.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Departments Management */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Departments
            </h2>

            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="Dept Code (e.g. COMP)"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                className="w-36 px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Department Name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add Dept
              </button>
            </form>

            <ul className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <li
                  key={dept.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold text-slate-700 mr-2">
                      [{dept.code}]
                    </span>
                    <span className="text-slate-800">{dept.name}</span>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleDeptActive(dept.id, dept.is_active)
                    }
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      dept.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {dept.is_active ? "Active" : "Inactive"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {activeTab === "roles" && currentUser?.role === "admin" && (
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            User Role Delegation
          </h2>
          <p className="text-xs text-slate-500">
            Promote standard student accounts to Moderator status to delegate
            moderation queue access without sharing system administration
            privileges.
          </p>

          <form onSubmit={handleRoleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target User UUID
              </label>
              <input
                type="text"
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Assign Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="moderator">Moderator</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Update User Role
            </button>
          </form>

          {roleMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${roleMessage.startsWith("Success") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {roleMessage}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

AdminTaxonomyDashboard.propTypes = {
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
};
