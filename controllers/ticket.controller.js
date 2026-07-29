const Ticket = require("../models/ticket.model");
const mongoose = require("mongoose");

function normalizePersianDigits(str) {
  if (!str) return "";
  let s = String(str);
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    s = s.replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
  }
  return s;
}

exports.createTicket = async (req, res) => {
  const title = String(req.body.title || "").trim();
  const message = String(req.body.message || "").trim();

  if (!title || !message) {
    return res.status(400).json({ success: false, message: "عنوان و متن پیام تیکت الزامی است" });
  }

  const department = req.body.department || "پشتیبانی عمومی";
  const priority = req.body.priority || "medium";
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : req.body.file ? [req.body.file] : [];

  const ticketNumber = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
  const senderName = req.user?.name || `${req.user?.fname || ""} ${req.user?.lname || ""}`.trim() || req.user?.mobile || "کاربر";

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now(), ticketNumber: "TCK-12345", status: "closed" } });
  }

  try {
    const newTicket = await Ticket.create({
      ticketNumber,
      userId: req.user?._id || "guest_id",
      userName: senderName,
      userMobile: req.user?.mobile || "",
      userRole: req.user?.role || "customer",
      title,
      department,
      priority,
      status: "open",
      messages: [{
        senderId: req.user?._id || "guest_id",
        senderName,
        senderRole: req.user?.role === "superAdmin" ? "admin" : "user",
        message,
        attachments,
        createdAt: new Date(),
      }],
      lastMessageAt: new Date(),
    });

    return res.json({ success: true, message: "تیکت با موفقیت ایجاد شد", data: newTicket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ایجاد تیکت.", error: error.message });
  }
};

exports.getTickets = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const statusFilter = String(req.query.status || "").trim();
  const search = String(req.query.search || req.query.q || "").trim();

  let ticketList = [];
  let totalTickets = 0;

  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    try {
      const query = {};
      const isAdmin = req.user?.role === "superAdmin";
      if (!isAdmin && req.user?._id) {
        query.userId = req.user._id;
      }

      if (statusFilter && statusFilter !== "all") {
        let englishStatus = statusFilter;
        if (statusFilter === "باز") englishStatus = "open";
        if (statusFilter === "بسته شده" || statusFilter === "بسته") englishStatus = "closed";
        if (statusFilter === "در انتظار پاسخ" || statusFilter === "در حال بررسی") englishStatus = "pending";
        if (statusFilter === "پاسخ داده شده") englishStatus = "replied";
        query.status = englishStatus;
      }

      if (search) {
        const regex = new RegExp(normalizePersianDigits(search), "i");
        query.$or = [
          { title: regex },
          { ticketNumber: regex },
          { userName: regex },
          { userMobile: regex },
          { department: regex },
        ];
      }

      totalTickets = await Ticket.countDocuments(query);
      const rawTickets = await Ticket.find(query).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean();
      ticketList = rawTickets.map(t => ({ ...t, userRole: t.userRole || "customer" }));
    } catch (e) {
      console.error("[getTickets] Error fetching tickets:", e.message);
    }
  }

  return res.json({
    success: true,
    data: ticketList,
    total: totalTickets,
    page,
    limit,
    totalPages: Math.ceil(totalTickets / limit) || 1,
  });
};

exports.getTicket = async (req, res) => {
  const ticketId = req.query.id || req.body.ticketId;
  if (!ticketId) return res.status(400).json({ success: false, message: "شناسه تیکت الزامی است" });

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now(), ticketNumber: "TCK-12345", status: "closed" } });

  try {
    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await Ticket.findById(ticketId).lean();
    }
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketNumber: ticketId }).lean();
    }

    if (!ticket) return res.status(404).json({ success: false, message: "تیکت یافت نشد" });

    ticket.userRole = ticket.userRole || "customer";
    return res.json({ success: true, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در دریافت تیکت" });
  }
};

exports.sendMessage = async (req, res) => {
  const ticketId = req.body.ticketId;
  const message = String(req.body.message || "").trim();

  if (!ticketId || !message) return res.status(400).json({ success: false, message: "شناسه تیکت و متن پیام الزامی است" });

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now(), ticketNumber: "TCK-12345", status: "closed" } });

  try {
    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await Ticket.findById(ticketId);
    }
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketNumber: ticketId });
    }

    if (!ticket) return res.status(404).json({ success: false, message: "تیکت یافت نشد" });

    const isAdmin = req.user?.role === "superAdmin";
    const senderRole = isAdmin ? "admin" : "user";
    const senderName = req.user?.name || `${req.user?.fname || ""} ${req.user?.lname || ""}`.trim() || req.user?.mobile || (isAdmin ? "پشتیبانی" : "کاربر");
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : req.body.file ? [req.body.file] : [];

    const newMessage = {
      senderId: req.user?._id || "guest_id",
      senderName,
      senderRole,
      message,
      attachments,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);
    ticket.lastMessageAt = new Date();
    ticket.status = isAdmin ? "replied" : "pending";

    await ticket.save();

    return res.json({ success: true, message: "پیام شما با موفقیت ثبت شد", data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ثبت پیام" });
  }
};

exports.closeTicket = async (req, res) => {
  const ticketId = req.body.ticketId;
  if (!ticketId) return res.status(400).json({ success: false, message: "شناسه تیکت الزامی است" });

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now(), ticketNumber: "TCK-12345", status: "closed" } });

  try {
    let ticket = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await Ticket.findById(ticketId);
    }
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketNumber: ticketId });
    }

    if (!ticket) return res.status(404).json({ success: false, message: "تیکت یافت نشد" });

    ticket.status = req.body.status || "closed";
    await ticket.save();

    return res.json({ success: true, message: `وضعیت تیکت به ${ticket.status} تغییر یافت`, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در بروزرسانی تیکت" });
  }
};
