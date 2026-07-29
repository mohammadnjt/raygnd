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
    companyName: { type: String, default: "" },
    companyPhone: { type: String, default: "" },
    companyAddress: { type: String, default: "" },
    companyScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
