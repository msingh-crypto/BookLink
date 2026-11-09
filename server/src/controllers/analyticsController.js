const analyticsModel = require("../models/analyticModel");

/**
 * GET /api/admin/analytics
 * Accepts query param ?range=weekly|monthly|semester
 */
async function getAnalytics(req, res) {
  try {
    const { range = "monthly" } = req.query;

    const validRanges = ["weekly", "monthly", "semester"];
    const selectedRange = validRanges.includes(range) ? range : "monthly";

    const [totals, timeSeries] = await Promise.all([
      analyticsModel.getMetricTotals(selectedRange),
      analyticsModel.getTimeSeriesMetrics(selectedRange),
    ]);

    return res.status(200).json({
      range: selectedRange,
      totals,
      timeSeries,
    });
  } catch (err) {
    console.error("Error fetching platform analytics:", err);
    return res.status(500).json({ error: "Failed to load analytics metrics." });
  }
}

module.exports = {
  getAnalytics,
};
