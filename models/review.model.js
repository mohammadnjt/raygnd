const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    score: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String, default: "" }
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, company: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
