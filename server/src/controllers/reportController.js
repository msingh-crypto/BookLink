const reportModel = require("../models/reportModel");

const submitReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reportedListingId, reportedUserId, reasonCategory, description } =
      req.body;

    if (!reportedListingId && !reportedUserId) {
      return res.status(400).json({
        error:
          "A report target (reportedListingId or reportedUserId) is required.",
      });
    }

    if (
      !reasonCategory ||
      typeof reasonCategory !== "string" ||
      !reasonCategory.trim()
    ) {
      return res
        .status(400)
        .json({ error: "A valid reason category is required." });
    }

    const report = await reportModel.createReport({
      reporterId,
      reportedListingId,
      reportedUserId,
      reasonCategory,
      description,
    });

    return res.status(201).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  submitReport,
};
