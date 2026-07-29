const mongoose = require("mongoose");

const InquiryHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    angCode: { type: String, required: true, index: true },
    labName: { type: String, default: "" },
    resultValue: { type: String, default: "" },
    status: { type: String, default: "تایید" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InquiryHistory", InquiryHistorySchema);
