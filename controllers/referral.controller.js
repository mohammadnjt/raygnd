const Referral = require("../models/referral.model");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const mongoose = require("mongoose");

function normalizeMobile(mobile) {
  if (!mobile) return "";
  let m = String(mobile).trim();
  if (m.startsWith("+98")) m = "0" + m.slice(3);
  if (m.startsWith("98")) m = "0" + m.slice(2);
  if (m.length === 10 && m.startsWith("9")) m = "0" + m;
  return m;
}

exports.createReferral = async (req, res) => {
  const { targetMode, targetMobile, targetFname, targetLname, targetCompanyName, targetCompanyPhone, targetCompanyAddress, targetCity } = req.body;

  if (req.user.role !== 'gold' && req.user.role !== 'lab') {
    return res.status(403).json({ success: false, message: "فقط طلافروشان و آزمایشگاه‌ها می‌توانند معرفی کنند." });
  }

  if (!targetMode || !['gold', 'lab'].includes(targetMode)) {
    return res.status(400).json({ success: false, message: "نوع کاربری (targetMode) نامعتبر است." });
  }

  if (!targetMobile || !targetCompanyName) {
    return res.status(400).json({ success: false, message: "شماره موبایل و نام مجموعه الزامی است." });
  }

  const mobile = normalizeMobile(targetMobile);
  try {
    const existingUser = await User.findOne({ mobile });
    if (existingUser && existingUser.role !== 'customer') {
      return res.status(400).json({ success: false, message: "این کاربر از قبل به عنوان طلافروش یا آزمایشگاه در سیستم ثبت شده است." });
    }

    if (targetCompanyPhone) {
      const existingCompany = await Company.findOne({ phone: targetCompanyPhone });
      if (existingCompany) {
        return res.status(400).json({ success: false, message: "شماره تلفن مجموعه وارد شده قبلا در سیستم ثبت شده است." });
      }
      const existingReferralPhone = await Referral.findOne({ targetCompanyPhone, status: 'pending' });
      if (existingReferralPhone) {
        return res.status(400).json({ success: false, message: "یک درخواست در انتظار تایید با این شماره تلفن مجموعه وجود دارد." });
      }
    }

    const existingReferral = await Referral.findOne({ targetMobile: mobile, status: 'pending' });
    if (existingReferral) {
      return res.status(400).json({ success: false, message: "یک درخواست در انتظار تایید با این شماره موبایل وجود دارد." });
    }

    const referral = await Referral.create({
      introducer: req.user._id,
      targetMode,
      targetMobile: mobile,
      targetFname,
      targetLname,
      targetCompanyName,
      targetCompanyPhone,
      targetCompanyAddress,
      targetCity
    });

    return res.json({ success: true, message: "درخواست معرفی با موفقیت ثبت شد و در انتظار تایید است.", data: referral });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در ثبت معرفی.", error: err.message });
  }
};

exports.getReferrals = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const requestedStatus = req.query.status;
  
  const query = {};
  if (req.user.role !== 'superAdmin') {
    query.introducer = req.user._id;
  }

  if (requestedStatus && requestedStatus !== 'all') {
    query.status = requestedStatus;
  } else if (!requestedStatus && req.user.role === 'superAdmin') {
    query.status = 'pending';
  }

  try {
    const referrals = await Referral.find(query)
      .populate('introducer', 'fname lname mobile companyId')
      .populate({ path: 'introducer', populate: { path: 'companyId', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    const total = await Referral.countDocuments(query);

    const statusLabels = {
      pending: "در انتظار تایید",
      approved: "تایید شده",
      rejected: "رد شده"
    };

    const formattedReferrals = referrals.map(ref => ({
      ...ref,
      statusLabel: statusLabels[ref.status] || ref.status
    }));
    
    return res.json({
      success: true,
      data: formattedReferrals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در دریافت لیست معرفی‌ها." });
  }
};

exports.getMyReferralRequests = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const requestedStatus = req.query.status; // 'pending', 'approved', 'rejected', or 'all'

  const query = { introducer: req.user._id };
  if (requestedStatus && requestedStatus !== 'all') {
    query.status = requestedStatus;
  }

  try {
    const referrals = await Referral.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Referral.countDocuments(query);

    const statusLabels = {
      pending: "در انتظار تایید",
      approved: "تایید شده",
      rejected: "رد شده"
    };

    const formattedReferrals = referrals.map(ref => ({
      ...ref,
      statusLabel: statusLabels[ref.status] || ref.status
    }));

    return res.json({
      success: true,
      data: formattedReferrals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در دریافت لیست درخواست‌های همکار.", error: err.message });
  }
};

exports.approveReferral = async (req, res) => {
  const { id } = req.body;
  
  if (req.user.role !== 'superAdmin') {
    return res.status(403).json({ success: false, message: "فقط ادمین کل می‌تواند تایید کند." });
  }

  try {
    const referral = await Referral.findById(id);
    if (!referral) return res.status(404).json({ success: false, message: "یافت نشد." });
    
    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, message: "این درخواست قبلا تعیین وضعیت شده است." });
    }

    let existingUser = await User.findOne({ mobile: referral.targetMobile });
    let user = existingUser;

    if (!user) {
      user = new User({
        mobile: referral.targetMobile,
        fname: referral.targetFname,
        lname: referral.targetLname,
        role: referral.targetMode,
        city: referral.targetCity,
        referredBy: referral.introducer
      });
    } else {
      user.fname = referral.targetFname || user.fname;
      user.lname = referral.targetLname || user.lname;
      user.role = referral.targetMode;
      user.city = referral.targetCity || user.city;
      if (!user.referredBy) {
        user.referredBy = referral.introducer;
      }
    }

    let company;
    if (user.companyId) {
      company = await Company.findById(user.companyId);
      if (company) {
        company.mode = referral.targetMode === "gold" ? "shop" : "lab";
        company.name = referral.targetCompanyName;
        company.phone = referral.targetCompanyPhone || company.phone;
        company.address = referral.targetCompanyAddress || company.address;
        await company.save();
      }
    }
    
    if (!company) {
      company = await Company.create({
        mode: referral.targetMode === "gold" ? "shop" : "lab",
        name: referral.targetCompanyName,
        phone: referral.targetCompanyPhone || "",
        address: referral.targetCompanyAddress || "",
        owner: user._id
      });
    }

    user.companyId = company._id;
    await user.save();
    
    referral.status = 'approved';
    referral.createdUser = user._id;
    await referral.save();
    
    return res.json({ success: true, message: "درخواست تایید و کاربر ایجاد شد." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در تایید درخواست.", error: err.message });
  }
};

exports.rejectReferral = async (req, res) => {
  const { id, reason } = req.body;
  
  if (req.user.role !== 'superAdmin') {
    return res.status(403).json({ success: false, message: "فقط ادمین کل می‌تواند رد کند." });
  }
  
  if (!reason) {
    return res.status(400).json({ success: false, message: "دلیل رد درخواست الزامی است." });
  }

  try {
    const referral = await Referral.findById(id);
    if (!referral) return res.status(404).json({ success: false, message: "یافت نشد." });
    
    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, message: "این درخواست قبلا تعیین وضعیت شده است." });
    }
    
    referral.status = 'rejected';
    referral.rejectReason = reason;
    await referral.save();
    
    return res.json({ success: true, message: "درخواست رد شد." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در رد درخواست.", error: err.message });
  }
};

exports.getTree = async (req, res) => {
  try {
    // A simplified tree builder:
    const users = await User.find({ role: { $in: ['gold', 'lab'] } })
      .populate('companyId', 'name mode')
      .lean();
      
    // Create map for fast lookup
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = {
        _id: u._id,
        fname: u.fname,
        lname: u.lname,
        role: u.role,
        companyName: u.companyId ? u.companyId.name : null,
        children: []
      };
    });
    
    const tree = [];
    users.forEach(u => {
      const node = userMap[u._id.toString()];
      if (u.referredBy && userMap[u.referredBy.toString()]) {
        userMap[u.referredBy.toString()].children.push(node);
      } else {
        tree.push(node);
      }
    });
    
    return res.json({ success: true, data: tree });
  } catch (err) {
    return res.status(500).json({ success: false, message: "خطا در دریافت درخت معرفی‌ها." });
  }
};
