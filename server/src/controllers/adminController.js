const adminModel = require("../models/adminModel");

async function getQueue(req, res) {
  try {
    const queue = await adminModel.getModerationQueue();
    return res.status(200).json({ queue });
  } catch (err) {
    console.error("Error fetching moderation queue:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve moderation queue." });
  }
}

async function handleRemoveListing(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const removedListing = await adminModel.removeListing(
      id,
      req.user.id,
      reason,
    );
    if (!removedListing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    return res.status(200).json({
      message: "Listing successfully removed from public view.",
      listing: removedListing,
    });
  } catch (err) {
    console.error("Error removing listing:", err);
    return res.status(500).json({ error: "Failed to remove listing." });
  }
}

async function handleSuspendUser(req, res) {
  try {
    const { id } = req.params;

    const suspendedUser = await adminModel.suspendUser(id);
    if (!suspendedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({
      message: "User account suspended and active sessions revoked.",
      user: suspendedUser,
    });
  } catch (err) {
    console.error("Error suspending user:", err);
    return res.status(500).json({ error: "Failed to suspend user account." });
  }
}

module.exports = {
  getQueue,
  handleRemoveListing,
  handleSuspendUser,
};
