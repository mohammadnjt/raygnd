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
    assayMethod: { type: String, default: "fireAssay" },
    selectedDate: { type: String, default: null },
    selectedTime: { type: String, default: null },
    source: { type: String, default: "online" },
    estimatedWeight: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    description: { type: String, default: "" },
    wageType: { type: String, enum: ["gram", "geram", "toman", "percent"], default: "toman" },
    wageValue: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    extraServices: [
      {
        title: { type: String },
        price: { type: Number }
      }
    ],
    weightReceived: { type: Number, default: 0 },
    imgReceived: { type: String, default: "" },
    pieces: [
      {
        id: { type: String },
        weight: { type: Number },
        dimensions: {
          length: { type: Number },
          width: { type: Number },
          thickness: { type: Number }
        },
        img: { type: String },
        ang: { type: String }
      }
    ],
    isPay: { type: Boolean, default: false },
    bookingDateLabel: { type: String, default: "" },
    manual: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "confirmed", "received", "melted", "delivered", "archived", "arshived", "cancelled", "completed"],
      default: "pending",
    },
    hasJewel: { type: Boolean, default: false },
    wage: { type: mongoose.Schema.Types.Mixed, default: null },
    labFeeAmount: { type: Number, default: 0 },
    labFeeType: { type: String, default: "toman" },
    sampleDelivered: { type: Boolean, default: false },
    sampleWeight: { type: Number, default: null },
    finalSampleWeight: { type: Number, default: null },
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
