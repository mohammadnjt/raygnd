const mongoose = require("mongoose");

const BookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    angCode: { type: String, required: true },
    labName: { type: String, default: "" },
    resultValue: { type: String, default: "" },
    status: { type: String, default: "تایید" },
    date: { type: String, default: "" },
    savedAt: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bookmark", BookmarkSchema);
