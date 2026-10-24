import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function ModerationDashboard({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          "Failed to load moderation queue. Ensure you have admin access.",
        );
      }

      const data = await response.json();
      setReports(data.queue || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRemoveListing = async (listingId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this listing from public view?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/remove`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "Campus policy violation" }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove listing.");
      }

      setActionMessage(`Listing ${listingId} removed successfully.`);
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to suspend this user? Active sessions will be revoked.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to suspend user.");
      }

      setActionMessage(`User account suspended successfully.`);
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">
          You do not have administrative permissions to view the moderation
          console.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto my-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Moderation Console
          </h2>
          <p className="text-sm text-slate-500">
            Review reported listings and take administrative action[cite: 1].
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          Refresh Queue
        </button>
      </div>

      {actionMessage && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          Loading reports queue...
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          No active policy reports in queue.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-semibold">Report ID</th>
                <th className="p-3 font-semibold">Reason</th>
                <th className="p-3 font-semibold">Listing / User</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.report_id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-slate-500 font-mono text-xs">
                    {report.report_id}
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-slate-800">
                      {report.reason_category}
                    </span>
                    {report.description && (
                      <p className="text-xs text-slate-500">
                        {report.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    {report.listing_title && (
                      <p className="font-medium text-slate-800">
                        Title: {report.listing_title}
                      </p>
                    )}
                    {report.reported_user_email && (
                      <p className="text-xs text-slate-500">
                        User: {report.reported_user_email}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        report.report_status === "action_taken"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {report.report_status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {report.listing_id &&
                      report.listing_status !== "removed" && (
                        <button
                          onClick={() => handleRemoveListing(report.listing_id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-md shadow-sm transition"
                        >
                          Remove Listing
                        </button>
                      )}
                    {report.reported_user_id &&
                      report.user_status !== "suspended" && (
                        <button
                          onClick={() =>
                            handleSuspendUser(report.reported_user_id)
                          }
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm transition"
                        >
                          Suspend Account
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

ModerationDashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
};
