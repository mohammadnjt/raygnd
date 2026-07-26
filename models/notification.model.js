const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    notifId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "system" },
    isRead: { type: Boolean, default: false },
    finger: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
