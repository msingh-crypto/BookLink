import React, { useState } from "react";
import PropTypes from "prop-types";

const CATEGORIES = [
  "Scam / Fraud",
  "Inappropriate Behavior / Harassment",
  "Misleading Listing Details",
  "Spam or Duplicate",
  "Other Policy Violation",
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType, // 'listing' or 'profile'
  targetId,
  targetTitle,
  onReportSubmitted,
}) {
  const [reasonCategory, setReasonCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reasonCategory) {
      setError("Please select a category for this report.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        reportedListingId: targetType === "listing" ? targetId : null,
        reportedUserId: targetType === "profile" ? targetId : null,
        reasonCategory,
        description,
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const contentType = res.headers ? res.headers.get("content-type") : null;
      const data =
        contentType && contentType.includes("application/json")
          ? await res.json()
          : {};

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      setSubmitted(true);
      if (onReportSubmitted) onReportSubmitted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setReasonCategory("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <div className="text-4xl">✅</div>
            <h3 className="text-lg font-bold text-slate-800">Report Logged</h3>
            <p className="text-sm text-slate-600">
              Thank you. Your report has been submitted for moderation review.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                Report Suspicious{" "}
                {targetType === "profile" ? "Profile" : "Listing"}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {targetTitle && (
              <p className="text-xs text-slate-500 font-medium">
                Target:{" "}
                <span className="text-slate-700 font-semibold">
                  {targetTitle}
                </span>
              </p>
            )}

            {error && (
              <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="reasonCategory"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Violation Category *
              </label>
              <select
                id="reasonCategory"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a reason --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description / Additional Details
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any context that will help moderators..."
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  targetType: PropTypes.oneOf(["listing", "profile"]).isRequired,
  targetId: PropTypes.string.isRequired,
  targetTitle: PropTypes.string,
  onReportSubmitted: PropTypes.func,
};
