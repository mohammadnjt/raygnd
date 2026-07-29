const Order = require("../models/order.model");
const Lab = require("../models/lab.model");
const Notification = require("../models/notification.model");
const ProjectRequest = require("../models/projectRequest.model");
const RentalRequest = require("../models/rentalRequest.model");
const mongoose = require("mongoose");

exports.getOrders = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, data: [] });
  }

  try {
    const isAdmin = req.user?.role === "superAdmin" || req.user?.role === "admin";
    const query = {};
    if (!isAdmin && req.user?._id) {
      if (req.user.role === "lab") {
        query.labId = req.user._id;
      } else {
        query.userId = req.user._id;
      }
    }
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در دریافت سفارشات" });
  }
};

exports.assignAng = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  const { orderId, stampCode } = req.body;
  if (!orderId || !stampCode) return res.status(400).json({ success: false, message: "شناسه سفارش و کد انگ الزامی است" });

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });

    order.stampCode = stampCode;
    order.status = "stamped";
    if (req.body.purity) order.purity = req.body.purity;
    await order.save();

    return res.json({ success: true, message: "انگ با موفقیت ثبت شد", data: order });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در ثبت انگ" });
  }
};

exports.deliverOrder = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ success: false, message: "شناسه سفارش الزامی است" });

  try {
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });

    order.status = "delivered";
    if (req.body.deliveredWeight) order.deliveredWeight = req.body.deliveredWeight;
    await order.save();

    return res.json({ success: true, message: "سفارش تحویل داده شد", data: order });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در تحویل سفارش" });
  }
};

exports.getLabs = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, data: [] });

  try {
    const labs = await Lab.find({ isActive: true }).sort({ labScore: -1 }).lean();
    return res.json({ success: true, data: labs });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در دریافت آزمایشگاه‌ها" });
  }
};

exports.getNotifications = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, data: [] });

  try {
    const notifs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: notifs });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در دریافت اعلانات" });
  }
};

exports.submitProject = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });

  try {
    await ProjectRequest.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      phone: req.body.phone,
    });
    return res.json({ success: true, message: "درخواست پروژه ثبت شد" });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در ثبت درخواست پروژه" });
  }
};

exports.submitRental = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });

  try {
    await RentalRequest.create({
      userId: req.user._id,
      equipment: req.body.equipment,
      duration: req.body.duration,
      phone: req.body.phone,
    });
    return res.json({ success: true, message: "درخواست اجاره ثبت شد" });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در ثبت درخواست اجاره" });
  }
};
