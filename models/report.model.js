const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    htmlData: {
      type: Array,
      default: [],
    },
    docText: {
      type: String,
      default: null,
    },
    lastSearchedBy: {
      type: String,
      default: null,
    },
    searchCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
