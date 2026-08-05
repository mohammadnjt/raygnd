const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    introducer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetMode: { type: String, enum: ['gold', 'lab'], required: true },
    targetMobile: { type: String, required: true },
    targetFname: { type: String, default: "" },
    targetLname: { type: String, default: "" },
    targetCompanyName: { type: String, required: true },
    targetCompanyPhone: { type: String, default: "" },
    targetCompanyAddress: { type: String, default: "" },
    targetCity: { type: String, default: "" },
    
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectReason: { type: String, default: "" },
    
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    createdUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);
