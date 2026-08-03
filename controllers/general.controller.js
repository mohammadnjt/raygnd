const Order = require("../models/order.model");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const Notification = require("../models/notification.model");
const ProjectRequest = require("../models/projectRequest.model");
const RentalRequest = require("../models/rentalRequest.model");
const mongoose = require("mongoose");
const moment = require("moment-jalaali");

const saveAngsToCollection = async (orderDoc) => {
  if (!orderDoc) return;
  const Ang = require("../models/ang.model");
  const pieces = (orderDoc.pieces && orderDoc.pieces.length > 0)
    ? orderDoc.pieces
    : (orderDoc.stampCode ? [{ ang: orderDoc.stampCode }] : []);

  for (const piece of pieces) {
    if (!piece || !piece.ang) continue;
    const angCode = String(piece.ang).trim();
    if (!angCode) continue;

    try {
      await Ang.updateOne(
        { code: angCode, labName: orderDoc.labName || "" },
        {
          $setOnInsert: {
            code: angCode,
            customer: orderDoc.sellerName || "",
            labName: orderDoc.labName || "",
            labPhone: orderDoc.sellerPhone || "",
            purity: String(orderDoc.purity || ""),
            date: orderDoc.bookingDateLabel || moment().format("jYYYY/jMM/jDD"),
            source: "raygir"
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("Error saving to Ang collection:", err.message);
    }
  }
};

exports.getOrders = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = String(req.query.search || "").trim();
    
    const user = req.user;
    const isAdmin = user?.role === "superAdmin";
    const query = {};

    if (!isAdmin && user?._id) {
      const userIdStr = user._id.toString();
      const userMobile = user.mobile || "";
      const userPhone = user.phone || "";

      const companyIds = new Set();
      if (user.companyId) {
        companyIds.add(user.companyId.toString());
      }
      try {
        const ownedCompanies = await Company.find({ owner: user._id }).lean();
        ownedCompanies.forEach(c => {
          if (c && c._id) companyIds.add(c._id.toString());
        });
      } catch (e) {
        // ignore
      }

      const orConditions = [
        { sellerId: userIdStr }
      ];

      if (mongoose.Types.ObjectId.isValid(userIdStr)) {
        orConditions.push({ sellerId: new mongoose.Types.ObjectId(userIdStr) });
      }

      if (userMobile) {
        orConditions.push({ sellerPhone: userMobile });
        orConditions.push({ sellerId: userMobile });
      }
      if (userPhone) {
        orConditions.push({ sellerPhone: userPhone });
      }

      Array.from(companyIds).forEach(compId => {
        orConditions.push({ labId: compId });
        if (mongoose.Types.ObjectId.isValid(compId)) {
          orConditions.push({ labId: new mongoose.Types.ObjectId(compId) });
        }
      });

      query.$or = orConditions;
    }

    if (search) {
      const searchConditions = [
        { orderId: { $regex: search, $options: "i" } },
        { stampCode: { $regex: search, $options: "i" } },
        { sellerName: { $regex: search, $options: "i" } },
        { sellerPhone: { $regex: search, $options: "i" } },
        { labName: { $regex: search, $options: "i" } }
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

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const isPostReceipt = ['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);
      if (isPostReceipt) {
        let orderChanged = false;
        if (!order.pieces || order.pieces.length === 0) {
          const generatedAng = await generateUniqueAng(order.labId);
          order.pieces = [{
            ang: generatedAng,
            weight: order.weightReceived || order.weight || 0
          }];
          order.stampCode = generatedAng;
          orderChanged = true;
        } else if (!order.pieces[0].ang || String(order.pieces[0].ang).trim() === '') {
          const generatedAng = await generateUniqueAng(order.labId);
          order.pieces[0].ang = generatedAng;
          order.stampCode = generatedAng;
          orderChanged = true;
        } else if (!order.stampCode) {
          order.stampCode = order.pieces[0].ang;
          orderChanged = true;
        }

        if (orderChanged) {
          await Order.updateOne({ _id: order._id }, { pieces: order.pieces, stampCode: order.stampCode });
        }

        if (order.status === 'archived') {
          await saveAngsToCollection(order);
        }
      }
    }

    const formattedOrders = orders.map(order => ({
        ...order,
        _id: order._id,
        orderNumber: order.orderId,
        customerName: order.sellerName,
        customerPhone: order.sellerPhone,
        orderDate: order.bookingDateLabel || order.createdAt,
        status: order.status,
        stampCode: order.stampCode,
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

const checkAngDuplicateInLab = async (labId, angCode, excludeOrderId = null) => {
  if (!labId || !angCode) return false;
  const query = {
    labId: { $in: [labId, labId.toString()] },
    status: { $ne: 'cancelled' },
    $or: [
      { stampCode: angCode },
      { "pieces.ang": angCode }
    ]
  };

  if (excludeOrderId) {
    query._id = { $ne: excludeOrderId };
  }

  const existing = await Order.findOne(query).lean();
  return !!existing;
};

const generateUniqueAng = async (labId) => {
  let isUnique = false;
  let newAng = '';
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    attempts++;
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    newAng = `Aa${randomDigits}`;

    const isDup = await checkAngDuplicateInLab(labId, newAng);
    if (!isDup) {
      isUnique = true;
    }
  }

  return newAng;
};

exports.verifyAng = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({
      success: true,
      isDuplicate: false,
      message: "کد انگ معتبر است و تکراری نیست"
    });
  }

  try {
    const angCode = (req.query.angCode || req.query.ang || req.body.angCode || req.body.ang || "").toString().trim();
    let labId = (req.query.labId || req.body.labId || "").toString().trim();
    const excludeOrderId = req.query.orderId || req.body.orderId || req.query.excludeOrderId || req.body.excludeOrderId;

    if (!angCode) {
      return res.status(400).json({ success: false, message: "کد انگ (angCode) الزامی است" });
    }

    if (!labId && req.user && req.user.companyId) {
      labId = req.user.companyId.toString();
    }

    if (!labId) {
      return res.status(400).json({ success: false, message: "شناسه آزمایشگاه (labId) الزامی است" });
    }

    const isDup = await checkAngDuplicateInLab(labId, angCode, excludeOrderId);

    if (isDup) {
      return res.status(200).json({
        success: false,
        isDuplicate: true,
        message: "این کد انگ قبلا در این آزمایشگاه ثبت شده است"
      });
    }

    return res.json({
      success: true,
      isDuplicate: false,
      message: "کد انگ معتبر است و تکراری نیست"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در استعلام کد انگ", error: error.message });
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

    const isDup = await checkAngDuplicateInLab(order.labId, stampCode, order._id);
    if (isDup) {
      return res.status(400).json({ success: false, message: "این کد انگ قبلا توسط این آزمایشگاه ثبت شده است" });
    }

    order.stampCode = stampCode;
    order.status = "stamped";
    if (req.body.purity) order.purity = req.body.purity;

    if (!order.pieces || order.pieces.length === 0) {
      order.pieces = [{ ang: stampCode, weight: order.weight || 0 }];
    } else {
      order.pieces[0].ang = stampCode;
    }

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


const toEnglishDigits = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

const normalizeDateStr = (dateStr) => {
  if (!dateStr) return '';
  let eng = toEnglishDigits(String(dateStr).trim()).replace(/-/g, '/');
  const parts = eng.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return eng;
};

const normalizeTimeStr = (timeStr) => {
  if (!timeStr) return '';
  let eng = toEnglishDigits(String(timeStr).trim()).replace(/\s+/g, '');
  const parts = eng.split('-');
  if (parts.length === 2) {
    const padTime = (t) => {
      const hp = t.split(':');
      if (hp.length === 2) {
        return `${hp[0].padStart(2, '0')}:${hp[1].padStart(2, '0')}`;
      }
      return t;
    };
    return `${padTime(parts[0])}-${padTime(parts[1])}`;
  }
  return eng;
};

const getDayKeyFromJalaliDate = (dateStr) => {
  if (!dateStr) return null;
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('/');
  if (parts.length === 3) {
    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);
    if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
      let m;
      if (jy > 1300 && jy < 1500) {
        m = moment(`${jy}/${jm}/${jd}`, 'jYYYY/jM/jD');
      } else {
        m = moment(`${jy}/${jm}/${jd}`, 'YYYY/M/D');
      }
      if (m && m.isValid()) {
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return dayMap[m.day()];
      }
    }
  }
  return null;
};

exports.getLabSettings = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });
  
  try {
    const labId = req.params.id;
    const dateParam = req.query.date || req.query.selectedDate;

    if (!mongoose.Types.ObjectId.isValid(labId)) {
      return res.status(400).json({ success: false, message: "شناسه آزمایشگاه نامعتبر است" });
    }

    const lab = await Company.findById(labId).lean();
    if (!lab || lab.mode !== 'lab') {
      return res.status(404).json({ success: false, message: "آزمایشگاه یافت نشد" });
    }

    let workingHours = lab.workingHours || {};

    const normalizedTargetDate = normalizeDateStr(dateParam);
    const reservedSlotsMap = new Set();

    const allLabOrders = await Order.find({ 
      labId: { $in: [labId, lab._id.toString()] },
      status: { $ne: 'cancelled' }
    }).lean();

    allLabOrders.forEach(o => {
      if (!o.selectedDate || !o.selectedTime) return;

      const orderDateNormalized = normalizeDateStr(o.selectedDate);

      // If a target date was passed in query, skip orders from other dates
      if (normalizedTargetDate && orderDateNormalized !== normalizedTargetDate) {
        return;
      }

      const orderDayKey = getDayKeyFromJalaliDate(o.selectedDate);
      const normTime = normalizeTimeStr(o.selectedTime);

      if (orderDayKey && normTime) {
        reservedSlotsMap.add(`${orderDayKey}_${normTime}`);
      }
    });

    const formattedWorkingHours = {};
    for (const [day, timeSlots] of Object.entries(workingHours)) {
      if (Array.isArray(timeSlots)) {
        formattedWorkingHours[day] = timeSlots.map(timeObj => {
          let start = "";
          let end = "";
          let timeStr = "";

          if (typeof timeObj === 'string') {
            timeStr = timeObj;
            const parts = timeStr.split("-").map(s => s.trim());
            start = parts[0] || "";
            end = parts[1] || "";
          } else if (typeof timeObj === 'object' && timeObj !== null) {
            start = timeObj.start || "";
            end = timeObj.end || "";
            timeStr = `${start}-${end}`;
          } else {
            return null;
          }

          const normSlot = normalizeTimeStr(timeStr);
          const isReserved = reservedSlotsMap.has(`${day}_${normSlot}`);

          return {
            reserv: isReserved,
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

    const normalizeTime = (t) => (typeof t === 'string' ? t.replace(/\s+/g, '') : '');
    const reqNormalizedTime = normalizeTime(selectedTime);

    const existingOrders = await Order.find({ 
      labId: { $in: [labId, lab._id.toString()] }, 
      selectedDate,
      status: { $ne: 'cancelled' }
    }).lean();

    const isAlreadyReserved = existingOrders.some(o => {
      if (!o.selectedTime) return false;
      return normalizeTime(o.selectedTime) === reqNormalizedTime;
    });

    if (isAlreadyReserved) {
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

    if (isSeller && !isLab && !isAdmin) {
      if (req.body.status !== undefined) {
        if (req.body.status === 'cancelled') {
          if (['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status)) {
            return res.status(400).json({ success: false, message: "امکان لغو سفارش پس از مرحله دریافت وجود ندارد" });
          }
        } else {
          return res.status(403).json({ success: false, message: "طلافروش فقط مجاز به لغو سفارش می‌باشد" });
        }
      }

      if (req.body.wageType !== undefined) {
        if (!['received', 'melted'].includes(order.status)) {
          return res.status(400).json({ success: false, message: "تغییر روش پرداخت تنها پس از مرحله دریافت و قبل از تحویل/بایگانی امکان‌پذیر است" });
        }
        order.wageType = req.body.wageType;
        order.wageValue = 0;
        order.totalPrice = 0;
      }
    }

    // Validate pieces if provided in req.body
    if (req.body.pieces && Array.isArray(req.body.pieces)) {
      const incomingPieces = req.body.pieces;
      const angsInBody = incomingPieces
        .map(p => (p && p.ang ? String(p.ang).trim() : ''))
        .filter(Boolean);

      // 1. Check duplicate inside the provided array
      const uniqueAngs = new Set(angsInBody);
      if (uniqueAngs.size < angsInBody.length) {
        return res.status(400).json({
          success: false,
          message: "کد انگ در قطعات ثبت‌شده تکراری است"
        });
      }

      // 2. Check each ang against lab database
      for (const angCode of angsInBody) {
        const isDup = await checkAngDuplicateInLab(order.labId, angCode, order._id);
        if (isDup) {
          return res.status(400).json({
            success: false,
            message: `کد انگ ${angCode} قبلاً در این آزمایشگاه ثبت شده است`
          });
        }
      }
    }

    const newStatus = req.body.status !== undefined ? req.body.status : order.status;

    const updatableFields = [
      "status", "weight", "description", "wageType", "wageValue", 
      "totalPrice", "extraServices", "weightReceived", "imgReceived", 
      "pieces", "isPay", "deliveryType", "deductions", "deliveredWeight", 
      "purity", "trustWeight", "sampleDelivered"
    ];

    let hasChanges = false;
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (isSeller && !isLab && !isAdmin) {
          // Seller is only allowed to change status or wageType, not cost numbers directly
          if (!["status", "wageType"].includes(field)) {
            return;
          }
        }
        order[field] = req.body[field];
        hasChanges = true;
      }
    });

    const isPostReceipt = ['received', 'melted', 'delivered', 'archived', 'completed'].includes(newStatus) || ['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);

    // When status is 'received' or any post-receipt stage, ensure first piece has a unique suggested ang
    if (isPostReceipt) {
      if (!order.pieces || order.pieces.length === 0) {
        const generatedAng = await generateUniqueAng(order.labId);
        order.pieces = [{
          ang: generatedAng,
          weight: order.weightReceived || order.weight || 0
        }];
        order.stampCode = generatedAng;
        hasChanges = true;
      } else if (!order.pieces[0].ang || String(order.pieces[0].ang).trim() === '') {
        const generatedAng = await generateUniqueAng(order.labId);
        order.pieces[0].ang = generatedAng;
        order.stampCode = generatedAng;
        hasChanges = true;
      }
    }

    // Keep order.stampCode in sync with pieces[0].ang if pieces exist and pieces[0].ang is set
    if (order.pieces && order.pieces.length > 0 && order.pieces[0].ang) {
      if (order.stampCode !== order.pieces[0].ang) {
        order.stampCode = order.pieces[0].ang;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await order.save();
    }

    if (newStatus === 'archived' || order.status === 'archived') {
      await saveAngsToCollection(order);
    }

    return res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      data: {
        ...order.toObject(),
        _id: order._id,
        orderNumber: order.orderId,
        status: order.status,
        stampCode: order.stampCode,
        pieces: order.pieces || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در به‌روزرسانی سفارش", error: error.message });
  }
};

exports.sellerUpdateOrder = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.status(503).json({ success: false, message: "دیتابیس متصل نیست" });

  try {
    const orderIdParam = req.params.id;
    const order = await Order.findById(orderIdParam);
    if (!order) return res.status(404).json({ success: false, message: "سفارش یافت نشد" });

    const user = await User.findById(req.user._id).lean();
    const isAdmin = user.role === 'superAdmin';
    const isSeller = order.sellerId === user._id.toString();

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ success: false, message: "فقط طلافروش ثبت‌کننده سفارش مجاز به این عملیات است" });
    }

    const { action, status, wageType } = req.body;

    // 1. Cancel order
    if (action === 'cancel' || status === 'cancelled') {
      if (['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status)) {
        return res.status(400).json({ 
          success: false, 
          message: "امکان لغو سفارش پس از مرحله دریافت توسط آزمایشگاه وجود ندارد" 
        });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, message: "این سفارش قبلا لغو شده است" });
      }
      order.status = 'cancelled';
      await order.save();
      return res.json({
        success: true,
        message: "سفارش با موفقیت لغو شد",
        data: {
          _id: order._id,
          orderNumber: order.orderId,
          status: order.status
        }
      });
    }

    // 2. Update payment method type (wageType)
    if (wageType !== undefined) {
      if (!['received', 'melted'].includes(order.status)) {
        return res.status(400).json({ 
          success: false, 
          message: "تغییر روش پرداخت تنها پس از مرحله دریافت توسط آزمایشگاه و قبل از تحویل/بایگانی امکان‌پذیر است" 
        });
      }
      if (!["gram", "toman", "percent"].includes(wageType)) {
        return res.status(400).json({ success: false, message: "نوع روش پرداخت (wageType) نامعتبر است" });
      }

      // Goldsmith only sets wageType. Reset cost values so lab can re-enter them
      order.wageType = wageType;
      order.wageValue = 0;
      order.totalPrice = 0;

      await order.save();
      return res.json({
        success: true,
        message: "نوع روش پرداخت با موفقیت تغییر یافت و مقادیر هزینه جهت ثبت مجدد توسط آزمایشگاه پاک شد",
        data: {
          _id: order._id,
          orderNumber: order.orderId,
          wageType: order.wageType,
          wageValue: order.wageValue,
          totalPrice: order.totalPrice,
          status: order.status
        }
      });
    }

    return res.status(400).json({ success: false, message: "عملیات غیرمجاز یا پارامتر ورودی نامشخص است" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در به روزرسانی سفارش توسط طلافروش", error: error.message });
  }
};

exports.cancelOrder = exports.sellerUpdateOrder;
exports.updatePaymentMethod = exports.sellerUpdateOrder;

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
