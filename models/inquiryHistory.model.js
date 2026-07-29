const mongoose = require("mongoose");

const InquiryHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    angCode: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InquiryHistory", InquiryHistorySchema);
