const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  htmlData: {
    type: Array,
    default: []
  },
  docText: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Report", ReportSchema);
