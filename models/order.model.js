const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    sellerId: { type: String, default: "" },
    sellerName: { type: String, default: "" },
    sellerPhone: { type: String, default: "" },
    labId: { type: String, default: "" },
    labName: { type: String, default: "" },
    meltMethod: { type: String, default: "traditional" },
    source: { type: String, default: "online" },
    estimatedWeight: { type: Number, default: 0 },
    bookingDateLabel: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "received", "melted", "delivered", "archived", "cancelled"],
      default: "pending",
    },
    hasJewel: { type: Boolean, default: false },
    wage: { type: mongoose.Schema.Types.Mixed, default: null },
    labFeeAmount: { type: Number, default: 0 },
    labFeeType: { type: String, default: "toman" },
    sampleDelivered: { type: Boolean, default: false },
    proformaNumber: { type: String, default: null },
    receivedWeight: { type: Number, default: null },
    meltedAtLabel: { type: String, default: null },
    deliveryType: { type: String, default: null },
    deductions: { type: Number, default: null },
    stampCode: { type: String, default: null },
    deliveredWeight: { type: Number, default: null },
    purity: { type: Number, default: null },
    trustWeight: { type: Number, default: null },
    purityResolvedAt: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
