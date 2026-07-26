const mongoose = require("mongoose");

const ProjectRequestSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    type: { type: String, default: "project" },
    status: { type: String, default: "pending" },
    workshopName: { type: String, default: "" },
    category: { type: String, default: "" },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    finger: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectRequest", ProjectRequestSchema);
