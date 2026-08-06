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
      const isPostConfirmation = ['confirmed', 'received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);
      const isPostReceipt = ['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);
      let orderChanged = false;

      if (isPostConfirmation && !order.proformaNumber) {
        order.proformaNumber = await generateUniqueProformaNumber();
        orderChanged = true;
      }

      if (isPostReceipt) {
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

        if (order.status === 'archived') {
          await saveAngsToCollection(order);
        }
      }

      if (orderChanged) {
        await Order.updateOne(
          { _id: order._id }, 
          { pieces: order.pieces, stampCode: order.stampCode, proformaNumber: order.proformaNumber }
        );
      }
    }

    const formattedOrders = orders.map(order => {
      const rw = order.receivedWeight ?? order.weightReceived ?? 0;
      return {
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
        receivedWeight: rw,
        weightReceived: rw,
        imgReceived: order.imgReceived,
        pieces: order.pieces || [],
        deliveryType: order.deliveryType,
        deductions: order.deductions,
        deliveredWeight: order.deliveredWeight,
        purity: order.purity,
        trustWeight: order.trustWeight,
        sampleWeight: order.sampleWeight,
        finalSampleWeight: order.finalSampleWeight,
        sampleDelivered: order.sampleDelivered,
        isPay: order.isPay
      };
    });
      
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
  const angStr = String(angCode).trim();
  const query = {
    labId: { $in: [labId, labId.toString()] },
    status: { $ne: 'cancelled' },
    $or: [
      { stampCode: angStr },
      { "pieces.ang": angStr }
    ]
  };

  if (excludeOrderId) {
    query._id = { $ne: excludeOrderId };
  }

  const existingOrder = await Order.findOne(query).lean();
  if (existingOrder) return true;

  try {
    const Ang = require("../models/ang.model");
    const Company = require("../models/company.model");
    const lab = await Company.findById(labId).lean();
    const labName = lab ? lab.name : "";

    const existingAng = await Ang.findOne({
      code: angStr,
      ...(labName ? { labName } : {})
    }).lean();
    if (existingAng) return true;
  } catch (err) {
    // ignore
  }

  return false;
};

const generateUniqueAng = async (labId) => {
  let isUnique = false;
  let newAng = '';
  let attempts = 0;

  while (!isUnique && attempts < 200) {
    attempts++;
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    newAng = String(randomDigits);

    const isDup = await checkAngDuplicateInLab(labId, newAng);
    if (!isDup) {
      isUnique = true;
    }
  }

  return newAng;
};

const generateUniqueProformaNumber = async () => {
  let isUnique = false;
  let newProforma = '';
  let attempts = 0;

  while (!isUnique && attempts < 200) {
    attempts++;
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    newProforma = `PRF-${randomDigits}`;

    const existing = await Order.findOne({ proformaNumber: newProforma }).lean();
    if (!existing) {
      isUnique = true;
    }
  }

  return newProforma;
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

  const {
    labId,
    companyId,
    selectedDate,
    selectedTime,
    meltMethod,
    assayMethod,
    description,
    weight,
    hasJewel,
    sellerName,
    sellerPhone,
    sellerId,
    manual
  } = req.body;

  const isLabRequester = req.user?.role === 'lab' || !!manual;

  if (!isDbConnected) {
    let mockLabId, mockSellerId, mockSellerName, mockSellerPhone;

    if (isLabRequester) {
      mockLabId = req.user?.companyId?.toString() || req.user?._id?.toString() || "507f1f77bcf86cd799439011";
      mockSellerId = sellerId || companyId || "seller-123456";
      mockSellerName = sellerName || "طلافروشی";
      mockSellerPhone = sellerPhone || "09121111111";
    } else {
      mockLabId = companyId || labId || "507f1f77bcf86cd799439011";
      mockSellerId = sellerId || req.user?._id?.toString() || "seller-123456";
      mockSellerName = sellerName || (req.user?.fname ? `${req.user.fname} ${req.user.lname}`.trim() : req.user?.mobile || "طلافروشی");
      mockSellerPhone = sellerPhone || req.user?.phone || req.user?.mobile || "09121111111";
    }

    const mockOrderNumber = "ORD-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

    return res.json({
      success: true,
      message: "سفارش با موفقیت ثبت شد",
      data: {
        _id: new mongoose.Types.ObjectId().toString(),
        orderNumber: mockOrderNumber,
        orderId: mockOrderNumber,
        companyId: mockLabId,
        labId: mockLabId,
        lab: {
          _id: mockLabId,
          name: "آزمایشگاه"
        },
        sellerId: mockSellerId,
        sellerName: mockSellerName,
        sellerPhone: mockSellerPhone,
        selectedDate: selectedDate || "",
        selectedTime: selectedTime || "",
        meltMethod: meltMethod || 'traditional',
        assayMethod: assayMethod || 'fireAssay',
        description: description || '',
        weight: weight || 0,
        hasJewel: !!hasJewel,
        manual: isLabRequester,
        status: 'pending'
      }
    });
  }

  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(401).json({ success: false, message: "کاربر یافت نشد" });

    const isUserLab = user.role === 'lab' || !!manual;

    let targetLabId = "";
    let labObj = null;
    let finalSellerId = "";
    let finalSellerName = "";
    let finalSellerPhone = "";

    if (isUserLab) {
      if (user.companyId) {
        labObj = await Company.findById(user.companyId).lean();
      }
      if (!labObj) {
        labObj = await Company.findOne({ owner: user._id, mode: 'lab' }).lean();
      }

      if (labObj) {
        targetLabId = labObj._id.toString();
      } else if (labId) {
        targetLabId = labId.toString();
        labObj = await Company.findById(targetLabId).lean();
      } else if (user.companyId) {
        targetLabId = user.companyId.toString();
      } else {
        targetLabId = user._id.toString();
      }

      const labName = labObj ? labObj.name : "آزمایشگاه";

      const goldsmithIdInput = sellerId || companyId;
      if (goldsmithIdInput) {
        let goldsmithComp = null;
        let goldsmithUser = null;

        if (mongoose.Types.ObjectId.isValid(goldsmithIdInput)) {
          goldsmithComp = await Company.findById(goldsmithIdInput).lean();
          if (!goldsmithComp) {
            goldsmithUser = await User.findById(goldsmithIdInput).lean();
          }
        }

        if (goldsmithComp) {
          finalSellerId = goldsmithComp.owner ? goldsmithComp.owner.toString() : goldsmithComp._id.toString();
          finalSellerName = sellerName || goldsmithComp.name;
          finalSellerPhone = sellerPhone || goldsmithComp.phone || "";
        } else if (goldsmithUser) {
          finalSellerId = goldsmithUser._id.toString();
          finalSellerName = sellerName || (goldsmithUser.fname ? `${goldsmithUser.fname} ${goldsmithUser.lname}`.trim() : goldsmithUser.mobile);
          finalSellerPhone = sellerPhone || goldsmithUser.phone || goldsmithUser.mobile || "";
        } else {
          finalSellerId = goldsmithIdInput.toString();
          finalSellerName = sellerName || "طلافروش";
          finalSellerPhone = sellerPhone || "";
        }
      } else {
        finalSellerId = sellerId || "";
        finalSellerName = sellerName || "";
        finalSellerPhone = sellerPhone || "";
      }

      const orderNumber = "ORD-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

      const newOrder = await Order.create({
        orderId: orderNumber,
        sellerId: finalSellerId,
        sellerName: finalSellerName,
        sellerPhone: finalSellerPhone,
        labId: targetLabId,
        labName: labName,
        selectedDate: selectedDate || null,
        selectedTime: selectedTime || null,
        meltMethod: meltMethod || 'traditional',
        assayMethod: assayMethod || 'fireAssay',
        description: description || '',
        weight: weight || 0,
        hasJewel: !!hasJewel,
        manual: true,
        status: 'pending',
        bookingDateLabel: selectedDate || ''
      });

      return res.json({
        success: true,
        data: {
          _id: newOrder._id,
          orderNumber: newOrder.orderId,
          orderId: newOrder.orderId,
          companyId: targetLabId,
          labId: targetLabId,
          lab: {
            _id: targetLabId,
            name: labName
          },
          sellerId: newOrder.sellerId,
          sellerName: newOrder.sellerName,
          sellerPhone: newOrder.sellerPhone,
          selectedDate: newOrder.selectedDate,
          selectedTime: newOrder.selectedTime,
          meltMethod: newOrder.meltMethod,
          assayMethod: newOrder.assayMethod,
          description: newOrder.description,
          weight: newOrder.weight,
          hasJewel: newOrder.hasJewel,
          manual: true,
          status: newOrder.status
        }
      });

    } else {
      targetLabId = (labId || companyId || "").toString().trim();
      if (!targetLabId && user.companyId) {
        targetLabId = user.companyId.toString();
      }

      if (!targetLabId) {
        return res.status(400).json({ success: false, message: "شناسه آزمایشگاه (companyId یا labId) الزامی است" });
      }

      const lab = await Company.findById(targetLabId).lean();
      if (!lab || lab.mode !== 'lab') {
        return res.status(404).json({ success: false, message: "آزمایشگاه نامعتبر است" });
      }

      if (selectedDate && selectedTime) {
        const normalizeTime = (t) => (typeof t === 'string' ? t.replace(/\s+/g, '') : '');
        const reqNormalizedTime = normalizeTime(selectedTime);

        const existingOrders = await Order.find({
          labId: { $in: [targetLabId, lab._id.toString()] },
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
      }

      const orderNumber = "ORD-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

      finalSellerId = sellerId || user._id.toString();
      finalSellerName = sellerName || (user.fname ? `${user.fname} ${user.lname}`.trim() : user.mobile || "");
      finalSellerPhone = sellerPhone || user.phone || user.mobile || "";

      const newOrder = await Order.create({
        orderId: orderNumber,
        sellerId: finalSellerId,
        sellerName: finalSellerName,
        sellerPhone: finalSellerPhone,
        labId: lab._id.toString(),
        labName: lab.name,
        selectedDate: selectedDate || null,
        selectedTime: selectedTime || null,
        meltMethod: meltMethod || 'traditional',
        assayMethod: assayMethod || 'fireAssay',
        description: description || '',
        weight: weight || 0,
        hasJewel: !!hasJewel,
        manual: false,
        status: 'pending',
        bookingDateLabel: selectedDate || ''
      });

      return res.json({
        success: true,
        data: {
          _id: newOrder._id,
          orderNumber: newOrder.orderId,
          orderId: newOrder.orderId,
          companyId: lab._id.toString(),
          labId: lab._id.toString(),
          lab: {
            _id: lab._id,
            name: lab.name
          },
          sellerId: newOrder.sellerId,
          sellerName: newOrder.sellerName,
          sellerPhone: newOrder.sellerPhone,
          selectedDate: newOrder.selectedDate,
          selectedTime: newOrder.selectedTime,
          meltMethod: newOrder.meltMethod,
          assayMethod: newOrder.assayMethod,
          description: newOrder.description,
          weight: newOrder.weight,
          hasJewel: newOrder.hasJewel,
          manual: false,
          status: newOrder.status
        }
      });
    }
  } catch (error) {
    console.error("Request Order Error:", error);
    return res.status(500).json({ success: false, message: "خطا در ثبت نوبت", error: error.message });
  }
};


exports.updateOrder = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    let newStatus = req.body.status || 'confirmed';
    if (newStatus === 'arshived') newStatus = 'archived';
    const rw = req.body.receivedWeight !== undefined ? Number(req.body.receivedWeight) : (req.body.weightReceived !== undefined ? Number(req.body.weightReceived) : 0);
    return res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      data: {
        _id: req.params.id,
        orderNumber: "ORD-123456",
        status: newStatus,
        wageType: req.body.wageType || "toman",
        wageValue: req.body.wageValue || 0,
        proformaNumber: req.body.proformaNumber || "pf-5648",
        extraServices: req.body.extraServices || [],
        totalPrice: req.body.totalPrice || 0,
        receivedWeight: rw,
        weightReceived: rw,
        imgReceived: req.body.imgReceived || "",
        pieces: req.body.pieces || [],
        deliveryType: req.body.deliveryType || null,
        deductions: req.body.deductions || 0,
        deliveredWeight: req.body.deliveredWeight || 0,
        purity: req.body.purity || null,
        sampleWeight: req.body.sampleWeight || null,
        finalSampleWeight: req.body.finalSampleWeight || null,
        sampleDelivered: req.body.sampleDelivered || false,
        isPay: req.body.isPay || false
      }
    });
  }
  
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

    let newStatus = req.body.status !== undefined ? req.body.status : order.status;
    if (newStatus === 'arshived') {
      newStatus = 'archived';
      req.body.status = 'archived';
    }

    if (req.body.proformaNumber !== undefined) {
      const pStr = String(req.body.proformaNumber).trim();
      if (pStr) {
        const existingP = await Order.findOne({
          proformaNumber: pStr,
          _id: { $ne: order._id }
        }).lean();
        if (existingP) {
          return res.status(400).json({
            success: false,
            message: `شماره پیش‌فاکتور ${pStr} قبلاً در سفارش دیگری ثبت شده است`
          });
        }
      }
    }

    const updatableFields = [
      "status", "weight", "description", "wageType", "wageValue", 
      "totalPrice", "extraServices", "weightReceived", "receivedWeight", "imgReceived", 
      "pieces", "isPay", "deliveryType", "deductions", "deliveredWeight", 
      "purity", "trustWeight", "sampleWeight", "finalSampleWeight", "sampleDelivered", "proformaNumber"
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

    // Ensure receivedWeight and weightReceived are ALWAYS synced together
    if (req.body.receivedWeight !== undefined || req.body.weightReceived !== undefined) {
      const rw = req.body.receivedWeight !== undefined ? Number(req.body.receivedWeight) : Number(req.body.weightReceived);
      order.receivedWeight = rw;
      order.weightReceived = rw;
      hasChanges = true;
    }

    if (req.body.extraServices !== undefined && Array.isArray(req.body.extraServices)) {
      order.extraServices = req.body.extraServices.map(item => ({
        title: item.title || "",
        price: Number(item.price || 0)
      }));
      hasChanges = true;
    }

    if (req.body.pieces !== undefined && Array.isArray(req.body.pieces)) {
      order.pieces = req.body.pieces.map(p => ({
        id: p.id || p._id || new mongoose.Types.ObjectId().toString(),
        ang: p.ang ? String(p.ang).trim() : '',
        weight: p.weight !== undefined ? Number(p.weight) : 0,
        dimensions: p.dimensions ? {
          length: Number(p.dimensions.length || 0),
          width: Number(p.dimensions.width || 0),
          thickness: Number(p.dimensions.thickness || 0)
        } : undefined,
        img: p.img || null
      }));
      hasChanges = true;
    }

    const isPostConfirmation = ['confirmed', 'received', 'melted', 'delivered', 'archived', 'completed'].includes(newStatus) || ['confirmed', 'received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);

    if (isPostConfirmation && !order.proformaNumber) {
      order.proformaNumber = await generateUniqueProformaNumber();
      hasChanges = true;
    }

    const isPostReceipt = ['received', 'melted', 'delivered', 'archived', 'completed'].includes(newStatus) || ['received', 'melted', 'delivered', 'archived', 'completed'].includes(order.status);

    // When status is 'received' or any post-receipt stage, ensure first piece has a unique suggested ang
    if (isPostReceipt) {
      const currentRw = order.receivedWeight ?? order.weightReceived ?? order.weight ?? 0;
      if (!order.pieces || order.pieces.length === 0) {
        const generatedAng = await generateUniqueAng(order.labId);
        order.pieces = [{
          id: new mongoose.Types.ObjectId().toString(),
          ang: generatedAng,
          weight: currentRw
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

    const finalRw = order.receivedWeight ?? order.weightReceived ?? 0;

    return res.json({
      success: true,
      message: "سفارش با موفقیت به‌روزرسانی شد",
      data: {
        ...order.toObject(),
        _id: order._id,
        orderNumber: order.orderId,
        status: order.status,
        stampCode: order.stampCode,
        receivedWeight: finalRw,
        weightReceived: finalRw,
        sampleWeight: order.sampleWeight,
        finalSampleWeight: order.finalSampleWeight,
        extraServices: order.extraServices || [],
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

exports.getGoldsmiths = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({
      success: true,
      data: [
        { _id: "650000000000000000000010", companyId: "650000000000000000000010", name: "طلافروشی احمدی", fname: "احمد", lname: "احمدی", mobile: "09121111111", phone: "02122222222", address: "بازار تهران، پلاک ۱۲", role: "gold" },
        { _id: "650000000000000000000011", companyId: "650000000000000000000011", name: "گالری طلا و جواهر مروارید", fname: "رضا", lname: "محمدی", mobile: "09122222222", phone: "02133333333", address: "خیابان کریمخان، پلاک ۴۵", role: "gold" }
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1
    });
  }

  try {
    const search = String(req.query.search || req.query.q || req.query.name || req.query.phone || req.query.mobile || "").trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const User = require("../models/user.model");
    const map = new Map();

    // 1. Query Users collection (only gold sellers and customers, strictly excluding lab and superAdmin)
    const userConditions = [{ role: { $nin: ["superAdmin", "lab"] } }];

    if (search) {
      const searchRegex = new RegExp(search, "i");
      userConditions.push({
        $or: [
          { fname: searchRegex },
          { lname: searchRegex },
          { mobile: searchRegex },
          { phone: searchRegex },
          { nationalCode: searchRegex },
          { address: searchRegex },
          { city: searchRegex }
        ]
      });
    }

    const users = await User.find({ $and: userConditions }).lean();
    const userIds = users.map(u => u._id);
    const userCompanies = await Company.find({ owner: { $in: userIds }, mode: { $ne: 'lab' } }).lean();
    const companyOwnerMap = new Map();
    userCompanies.forEach(c => {
      if (c.owner) {
        companyOwnerMap.set(c.owner.toString(), c._id.toString());
      }
    });

    users.forEach(u => {
      const key = u.mobile || u.phone || (u._id ? u._id.toString() : Math.random().toString());
      const fullName = `${u.fname || ''} ${u.lname || ''}`.trim() || u.mobile || u.phone || "طلافروش";
      const userCompId = u.companyId ? u.companyId.toString() : (companyOwnerMap.get(u._id ? u._id.toString() : '') || (u._id ? u._id.toString() : key));
      
      map.set(key, {
        _id: u._id,
        companyId: userCompId,
        name: fullName,
        fname: u.fname || "",
        lname: u.lname || "",
        mobile: u.mobile || "",
        phone: u.phone || "",
        nationalCode: u.nationalCode || "",
        address: u.address || "",
        city: u.city || "",
        role: u.role || "gold"
      });
    });

    // 2. Query Companies with mode 'shop' / non-lab
    const companyConditions = [{ mode: { $ne: 'lab' } }];
    if (search) {
      const searchRegex = new RegExp(search, "i");
      companyConditions.push({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { address: searchRegex },
          { city: searchRegex }
        ]
      });
    }
    const shopCompanies = await Company.find({ $and: companyConditions }).lean();
    shopCompanies.forEach(c => {
      const key = c.phone || (c.owner ? c.owner.toString() : c._id.toString());
      if (!map.has(key)) {
        map.set(key, {
          _id: c.owner ? c.owner.toString() : c._id.toString(),
          companyId: c._id.toString(),
          name: c.name || "طلافروشی",
          fname: c.name || "",
          lname: "",
          mobile: c.phone || "",
          phone: c.phone || "",
          address: c.address || "",
          city: c.city || "",
          role: "gold"
        });
      }
    });

    // 2. Query Orders collection for sellers
    const orderConditions = [];
    if (search) {
      const searchRegex = new RegExp(search, "i");
      orderConditions.push({
        $or: [
          { sellerName: searchRegex },
          { sellerPhone: searchRegex }
        ]
      });
    }

    const orders = await Order.find(orderConditions.length > 0 ? { $and: orderConditions } : {})
      .select("sellerName sellerPhone sellerId companyId labId")
      .lean();

    orders.forEach(o => {
      if (o.sellerPhone || o.sellerName) {
        const key = o.sellerPhone || (o.sellerId ? o.sellerId.toString() : o.sellerName);
        const orderCompId = o.companyId ? o.companyId.toString() : (o.sellerId ? o.sellerId.toString() : key);
        if (!map.has(key)) {
          map.set(key, {
            _id: o.sellerId || key,
            companyId: orderCompId,
            name: o.sellerName || o.sellerPhone || "طلافروش",
            fname: o.sellerName || "",
            lname: "",
            mobile: o.sellerPhone || "",
            phone: o.sellerPhone || "",
            address: "",
            city: "",
            role: "gold"
          });
        }
      }
    });

    const allGoldsmiths = Array.from(map.values());
    const total = allGoldsmiths.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = allGoldsmiths.slice(startIndex, startIndex + limit);

    return res.json({
      success: true,
      data: paginatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    console.error("Get Goldsmiths Error:", error);
    return res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست طلافروشان",
      error: error.message
    });
  }
};

exports.getRecentLabs = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({
      success: true,
      data: [
        { _id: "650000000000000000000001", name: "آزمایشگاه زرین", labName: "آزمایشگاه زرین", phone: "02188888888", address: "تهران، بازار بزرگ", date: "1405/07/15", lastOrderDate: "1405/07/15", selectedDate: "1405/07/15", orderDate: "1405/07/15" },
        { _id: "650000000000000000000002", name: "آزمایشگاه البرز", labName: "آزمایشگاه البرز", phone: "02177777777", address: "تهران، خیابان 15 خرداد", date: "1405/07/14", lastOrderDate: "1405/07/14", selectedDate: "1405/07/14", orderDate: "1405/07/14" }
      ]
    });
  }

  try {
    const user = req.user;
    const userIdStr = user?._id ? user._id.toString() : "";
    const userMobile = user?.mobile || "";
    const userPhone = user?.phone || "";

    const sellerConditions = [
      { sellerId: userIdStr }
    ];
    if (mongoose.Types.ObjectId.isValid(userIdStr)) {
      sellerConditions.push({ sellerId: new mongoose.Types.ObjectId(userIdStr) });
    }
    if (userMobile) {
      sellerConditions.push({ sellerPhone: userMobile });
      sellerConditions.push({ sellerId: userMobile });
    }
    if (userPhone) {
      sellerConditions.push({ sellerPhone: userPhone });
    }

    const orders = await Order.find({
      $or: sellerConditions,
      status: { $ne: 'cancelled' }
    })
    .sort({ createdAt: -1 })
    .lean();

    const labIds = [];
    const labLastDateMap = {};
    for (const order of orders) {
      if (order.labId) {
        const idStr = order.labId.toString();
        if (!labIds.includes(idStr)) {
          labIds.push(idStr);
          labLastDateMap[idStr] = order.selectedDate || order.bookingDateLabel || (order.createdAt ? order.createdAt.toISOString() : "");
        }
      }
      if (labIds.length >= 4) break;
    }

    if (labIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const objectLabIds = labIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
    const labs = await Company.find({
      $or: [
        { _id: { $in: objectLabIds } },
        { _id: { $in: labIds } }
      ]
    }).lean();

    const sortedLabs = labIds.map(id => {
      const labDoc = labs.find(l => l && l._id.toString() === id);
      if (!labDoc) return null;
      const orderDate = labLastDateMap[id] || "";
      return {
        _id: labDoc._id,
        name: labDoc.name,
        labName: labDoc.name,
        phone: labDoc.phone || "",
        address: labDoc.address || "",
        score: labDoc.score || 0,
        workingHours: labDoc.workingHours || {},
        date: orderDate,
        lastOrderDate: orderDate,
        selectedDate: orderDate,
        orderDate: orderDate
      };
    }).filter(Boolean);

    return res.json({ success: true, data: sortedLabs });
  } catch (error) {
    console.error("Recent Labs Error:", error);
    return res.status(500).json({ success: false, message: "خطا در دریافت آزمایشگاه‌های اخیر", error: error.message });
  }
};
