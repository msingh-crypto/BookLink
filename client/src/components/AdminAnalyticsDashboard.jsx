import React, { useState, useEffect } from "react";

export default function AdminAnalyticsDashboard() {
  const [range, setRange] = useState("monthly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const fetchAnalytics = async (selectedRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load platform analytics.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.timeSeries) return;

    const headers = ["Period", "New Users", "Active Listings", "Items Sold"];
    const rows = data.timeSeries.map((row) => [
      new Date(row.period).toLocaleDateString(),
      row.new_users,
      row.active_listings,
      row.items_sold,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_report_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading analytics dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  const { totals, timeSeries } = data;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Platform Analytics
          </h2>
          <p className="text-sm text-slate-500">
            Track user growth, active inventory, and completed sales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            {["weekly", "monthly", "semester"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  range === r
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Registered Users
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {totals?.total_registered_users || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Listings
          </span>
          <div className="text-3xl font-extrabold text-blue-700 mt-2">
            {totals?.total_active_listings || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Items Sold
          </span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            {totals?.total_items_sold || 0}
          </div>
        </div>
      </div>

      {/* Trend Table / Graph Representation */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800">
          Aggregated Time Series Metrics
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold">New Registrations</th>
                <th className="py-3 px-4 font-semibold">Active Listings</th>
                <th className="py-3 px-4 font-semibold">Completed Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeSeries && timeSeries.length > 0 ? (
                timeSeries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {new Date(row.period).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">{row.new_users}</td>
                    <td className="py-3 px-4">{row.active_listings}</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">
                      {row.items_sold}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    No metric data available for this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
