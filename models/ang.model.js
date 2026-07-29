const mongoose = require("mongoose");

const angSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    labName: { type: String, default: "" },
    labPhone: { type: String, default: "" },
    purity: { type: String, default: "" },
    date: { type: String, default: "" },
    source: { type: String, default: "local" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ang", angSchema);
