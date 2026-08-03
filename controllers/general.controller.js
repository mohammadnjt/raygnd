const Order = require("../models/order.model");
const User = require("../models/user.model");
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
      const orConditions = [{ sellerId: req.user._id.toString() }];
      if (req.user.companyId) {
        orConditions.push({ labId: req.user.companyId.toString() });
      }
      query.$or = orConditions;
    }

    if (search) {
      const searchConditions = [
        { orderId: { $regex: search, $options: "i" } },
        { stampCode: { $regex: search, $options: "i" } }
      ];
      if (query.$or) {
        query.$and = [ { $or: query.$or }, { $or: searchConditions } ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedOrders = orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderId,
        customerName: order.sellerName,
        customerPhone: order.sellerPhone,
        orderDate: order.bookingDateLabel || order.createdAt,
        status: order.status,
        lab: {
          _id: order.labId,
          name: order.labName
        },
        meltMethod: order.meltMethod,
        assayMethod: order.assayMethod,
        selectedDate: order.selectedDate,
        selectedTime: order.selectedTime,
        weight: order.weight || order.estimatedWeight,
        hasJewel: order.hasJewel,
        description: order.description,
        manual: order.manual || false,
        wageType: order.wageType,
        wageValue: order.wageValue,
        proformaNumber: order.proformaNumber,
        extraServices: order.extraServices || [],
        totalPrice: order.totalPrice,
        weightReceived: order.weightReceived,
        imgReceived: order.imgReceived,
        pieces: order.pieces || [],
        deliveryType: order.deliveryType,
        deductions: order.deductions,
        deliveredWeight: order.deliveredWeight,
        purity: order.purity,
        trustWeight: order.trustWeight,
        sampleDelivered: order.sampleDelivered,
        isPay: order.isPay
    }));
      
    const totalOrders = await Order.countDocuments(query);

    return res.json({ 
      success: true, 
      data: formattedOrders,
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


exports.getLabSettings = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  try {
    const labId = req.params.id;
    const { date } = req.query; // e.g. 1405/07/15

    if (!mongoose.Types.ObjectId.isValid(labId)) {
      return res.status(400).json({ success: false, message: "شناسه آزمایشگاه نامعتبر است" });
    }

    const lab = await Company.findById(labId).lean();
    if (!lab || lab.mode !== 'lab') {
      return res.status(404).json({ success: false, message: "آزمایشگاه یافت نشد" });
    }

    let workingHours = lab.workingHours || {};
    let reservedSlots = [];

    if (date) {
      const orders = await Order.find({ labId, selectedDate: date }).lean();
      reservedSlots = orders.map(o => o.selectedTime).filter(Boolean);
    }

    const formattedWorkingHours = {};
    for (const [day, timeSlots] of Object.entries(workingHours)) {
      if (Array.isArray(timeSlots)) {
        formattedWorkingHours[day] = timeSlots.map(timeStr => {
          if (typeof timeStr !== 'string') {
            return null;
          }
          const parts = timeStr.split("-").map(s => s.trim());
          const start = parts[0] || "";
          const end = parts[1] || "";
          return {
            reserv: reservedSlots.includes(timeStr),
            start,
            end
          };
        }).filter(Boolean);
      }
    }

    return res.json({
      success: true,
      lab: {
        _id: lab._id,
        labName: lab.name,
        workingHours: formattedWorkingHours
      }
    });
  } catch (error) {
    console.error("Get Lab Settings Error:", error); return res.status(500).json({ success: false, message: "خطا در دریافت تنظیمات آزمایشگاه", error: error.message });
  }
};

exports.requestOrder = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(401).json({ success: false, message: "کاربر یافت نشد" });

    const { labId, selectedDate, selectedTime, meltMethod, assayMethod, description, weight, hasJewel } = req.body;
    
    if (!labId || !selectedDate || !selectedTime) {
      return res.status(400).json({ success: false, message: "آزمایشگاه، تاریخ و ساعت الزامی است" });
    }

    const lab = await Company.findById(labId).lean();
    if (!lab || lab.mode !== 'lab') {
      return res.status(404).json({ success: false, message: "آزمایشگاه نامعتبر است" });
    }

    const existingOrder = await Order.findOne({ labId, selectedDate, selectedTime });
    if (existingOrder) {
      return res.status(400).json({ success: false, message: "این زمان قبلا رزرو شده است" });
    }

    const orderNumber = "ORD-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

    const isManual = user.companyId && user.companyId.toString() === lab._id.toString();

    const newOrder = await Order.create({
      orderId: orderNumber,
      sellerId: user._id.toString(),
      sellerName: user.fname ? (user.fname + " " + user.lname).trim() : user.mobile,
      sellerPhone: user.phone || user.mobile,
      labId: lab._id.toString(),
      labName: lab.name,
      selectedDate,
      selectedTime,
      meltMethod: meltMethod || 'traditional',
      assayMethod: assayMethod || 'fireAssay',
      description: description || '',
      weight: weight || 0,
      hasJewel: !!hasJewel,
      manual: !!isManual,
      status: 'pending',
      bookingDateLabel: selectedDate
    });

    return res.json({
      success: true,
      data: {
        _id: newOrder._id,
        orderNumber: newOrder.orderId,
        lab: {
          _id: lab._id,
          name: lab.name
        },
        selectedDate: newOrder.selectedDate,
        selectedTime: newOrder.selectedTime,
        meltMethod: newOrder.meltMethod,
        assayMethod: newOrder.assayMethod
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ثبت نوبت" });
  }
};


exports.updateOrder = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  try {
    const orderIdParam = req.params.id; // this is the _id of the order
    const order = await Order.findById(orderIdParam);
    if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });

    // Check permissions (superAdmin or lab owner or the seller)
    const user = await User.findById(req.user._id).lean();
    const isAdmin = user.role === 'superAdmin';
    const isLab = order.labId === user.companyId?.toString();
    const isSeller = order.sellerId === user._id.toString();

    if (!isAdmin && !isLab && !isSeller) {
        return res.status(403).json({ success: false, message: "شما دسترسی ویرایش این سفارش را ندارید" });
    }

    const updatableFields = [
      "status", "weight", "description", "wageType", "wageValue", 
      "totalPrice", "extraServices", "weightReceived", "imgReceived", 
      "pieces", "isPay", "deliveryType", "deductions", "deliveredWeight", 
      "purity", "trustWeight", "sampleDelivered"
    ];

    let hasChanges = false;
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await order.save();
    }

    return res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      data: {
        _id: order._id,
        orderNumber: order.orderId,
        status: order.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در به‌روزرسانی سفارش", error: error.message });
  }
};

exports.getRecentLabs = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  try {
    const orders = await Order.find({ 
      sellerId: req.user._id.toString(), 
      status: { $in: ['archived', 'completed'] }
    })
    .sort({ createdAt: -1 })
    .lean();

    const labIds = [];
    for (const order of orders) {
      if (!labIds.includes(order.labId)) {
        labIds.push(order.labId);
      }
      if (labIds.length >= 4) break;
    }

    const labs = await Company.find({ _id: { $in: labIds } }).lean();
    const sortedLabs = labIds.map(id => labs.find(l => l._id.toString() === id)).filter(Boolean);

    return res.json({ success: true, data: sortedLabs });
  } catch (error) {
    console.error("Recent Labs Error:", error);
    return res.status(500).json({ success: false, message: "خطا در دریافت آزمایشگاه‌های اخیر" });
  }
};
