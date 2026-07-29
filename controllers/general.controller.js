const Order = require("../models/order.model");
const Company = require("../models/company.model");
const Notification = require("../models/notification.model");
const ProjectRequest = require("../models/projectRequest.model");
const RentalRequest = require("../models/rentalRequest.model");
const mongoose = require("mongoose");

exports.getOrders = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = String(req.query.search || "").trim();
    
    const isAdmin = req.user?.role === "superAdmin";
    const query = {};
    if (!isAdmin && req.user?._id) {
      if (req.user.role === "lab") {
        query.labId = req.user._id;
      } else {
        query.userId = req.user._id;
      }
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { stampCode: { $regex: search, $options: "i" } }
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    const totalOrders = await Order.countDocuments(query);

    return res.json({ 
      success: true, 
      data: orders,
      total: totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit) || 1
    });
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
  if (!isDbConnected) {
    return res.json({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = String(req.query.search || "").trim();
    
    const query = { mode: 'lab' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }
      ];
    }

    const labs = await Company.find(query)
      .sort({ score: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    const totalLabs = await Company.countDocuments(query);

    return res.json({ 
      success: true, 
      data: labs.map(lab => ({
        _id: lab._id,
        labName: lab.name,
        labPhone: lab.phone,
        labAddress: lab.address,
        labScore: lab.score,
        ownerId: lab.owner,
      })),
      total: totalLabs,
      page,
      limit,
      totalPages: Math.ceil(totalLabs / limit) || 1
    });
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
