const mongoose = require("mongoose");

const LabSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    score: { type: Number, default: 0 },
    rank: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lab", LabSchema);
