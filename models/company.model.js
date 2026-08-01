const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['shop', 'lab'], required: true },
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    score: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    workingHours: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
