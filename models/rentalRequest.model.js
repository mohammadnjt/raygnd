const mongoose = require("mongoose");

const RentalRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    type: { type: String, default: "rental" },
    status: { type: String, default: "در حال بررسی" },
    workshopName: { type: String, default: "" },
    date: { type: String, default: "" },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    finger: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentalRequest", RentalRequestSchema);
