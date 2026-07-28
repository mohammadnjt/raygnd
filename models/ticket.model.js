const mongoose = require("mongoose");

const TicketMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.Mixed },
    senderName: { type: String, default: "" },
    senderRole: { type: String, default: "user" },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  }
);

const TicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    userName: { type: String, default: "" },
    userMobile: { type: String, default: "" },
    title: { type: String, required: true },
    department: { type: String, default: "پشتیبانی عمومی" },
    priority: { type: String, default: "medium" },
    status: {
      type: String,
      default: "open", // "open", "pending", "replied", "closed", "در انتظار پاسخ", "پاسخ داده شده", "بسته شده"
    },
    messages: [TicketMessageSchema],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
