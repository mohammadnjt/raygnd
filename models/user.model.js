const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true },
    fname: { type: String, default: "" },
    lname: { type: String, default: "" },
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    nationalCode: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "gold", "lab", "superAdmin"],
      default: "customer",
    },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
