const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true },
    fname: { type: String, default: "" },
    lname: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    avatar: { type: String, default: "" },
    nationalCode: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "gold", "lab", "superAdmin", "admin"],
      default: "customer",
    },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "active" },
    labName: { type: String, default: "" },
    labPhone: { type: String, default: "" },
    labAddress: { type: String, default: "" },
    labScore: { type: Number, default: 0 },
    shopName: { type: String, default: "" },
    shopPhone: { type: String, default: "" },
    shopAddress: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
