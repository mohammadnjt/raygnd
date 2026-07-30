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

    // Check if order already has an ang (prevent duplicate assign to the same order)
    if (order.stampCode) {
      return res.status(400).json({ success: false, message: "برای این سفارش قبلا کد انگ ثبت شده است" });
    }

    const requestedPurity = req.body.purity || order.purity;

    // Check if the same stampCode + labId + purity already exists
    if (requestedPurity) {
      const existingAng = await Order.findOne({
        stampCode: stampCode,
        labId: order.labId,
        purity: requestedPurity,
        _id: { $ne: order._id }
      });
      if (existingAng) {
        return res.status(400).json({ 
          success: false, 
          message: "این کد انگ با همین عیار قبلا توسط این آزمایشگاه ثبت شده است" 
        });
      }
    } else {
       // if no purity, just check stampCode + labId
       const existingAng = await Order.findOne({
        stampCode: stampCode,
        labId: order.labId,
        _id: { $ne: order._id }
      });
      if (existingAng) {
        return res.status(400).json({ 
          success: false, 
          message: "این کد انگ قبلا توسط این آزمایشگاه ثبت شده است" 
        });
      }
    }

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
      .populate('owner')
      .sort({ score: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const totalLabs = await Company.countDocuments(query);
    const domain = process.env.DOMAIN_URL || "https://raygnd.blhgroups.ir";

    return res.json({ 
      success: true, 
      data: labs.map(lab => {
        let avatarUrl = "";
        if (lab.owner && lab.owner.avatar) {
            avatarUrl = lab.owner.avatar.startsWith('http') ? lab.owner.avatar : `${domain}${lab.owner.avatar}`;
        }
        return {
          _id: lab._id,
          labName: lab.name,
          labPhone: lab.phone,
          labAddress: lab.address,
          labScore: lab.score,
          ownerId: lab.owner ? lab.owner._id : null,
          avatar: avatarUrl
        };
      }),
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

exports.getDashboard = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, topLabs: [] });
  }

  try {
    const topLabs = await Company.find({ mode: 'lab' })
      .sort({ score: -1, createdAt: 1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      topLabs: topLabs.map(lab => ({
        _id: lab._id,
        labName: lab.name,
        labPhone: lab.phone,
        labAddress: lab.address,
        labScore: lab.score,
        ownerId: lab.owner,
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در دریافت اطلاعات داشبورد" });
  }
};

const Review = require("../models/review.model");

exports.rateCompany = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });

  const { companyId, score, comment } = req.body;
  if (!companyId) return res.status(400).json({ success: false, message: "شناسه مجموعه الزامی است." });
  
  const parsedScore = parseFloat(score);
  if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 5) {
    return res.status(400).json({ success: false, message: "امتیاز باید عددی بین ۰ تا ۵ باشد." });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "مجموعه یافت نشد." });
    }

    // Check if user already rated
    const existingReview = await Review.findOne({ user: req.user._id, company: companyId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "شما قبلا به این مجموعه امتیاز داده‌اید." });
    }

    await Review.create({
      user: req.user._id,
      company: companyId,
      score: parsedScore,
      comment: comment || ""
    });

    // Calculate new average score
    const allReviews = await Review.find({ company: companyId });
    const totalScore = allReviews.reduce((sum, rev) => sum + rev.score, 0);
    const avgScore = allReviews.length > 0 ? (totalScore / allReviews.length) : 0;
    
    // Update company score
    company.score = parseFloat(avgScore.toFixed(1));
    await company.save();

    return res.json({ success: true, message: "امتیاز شما با موفقیت ثبت شد.", data: { newScore: company.score } });
  } catch (e) {
    return res.status(500).json({ success: false, message: "خطا در ثبت امتیاز", error: e.message });
  }
};
