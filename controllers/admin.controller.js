const User = require("../models/user.model");
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

exports.getUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const search = String(req.query.search || req.query.q || "").trim();
  const roleFilter = String(req.query.role || "").trim();
  const statusFilter = String(req.query.status || "").trim();

  let usersList = [];
  let totalUsers = 0;

  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    try {
      const query = {};

      if (req.user && req.user._id && mongoose.Types.ObjectId.isValid(req.user._id.toString())) {
        query._id = { $ne: req.user._id };
      }

      if (roleFilter && roleFilter !== "all") {
        let englishRole = roleFilter;
        if (roleFilter === "مشتری" || roleFilter === "کاربر عادی") englishRole = "customer";
        if (roleFilter === "طلاساز") englishRole = "gold";
        if (roleFilter === "آزمایشگاه" || roleFilter === "ری‌گیری") englishRole = "lab";
        if (roleFilter === "مدیر" || roleFilter === "ادمین") englishRole = "admin";
        if (roleFilter === "مدیر کل" || roleFilter === "سوپر ادمین") englishRole = "superAdmin";
        query.role = englishRole;
      }

      if (statusFilter && statusFilter !== "all") {
        let englishStatus = statusFilter;
        if (statusFilter === "فعال") englishStatus = "active";
        if (statusFilter === "غیرفعال" || statusFilter === "غیر فعال") englishStatus = "inactive";
        
        if (englishStatus === "active") {
          query.isActive = { $ne: false };
        } else if (englishStatus === "inactive") {
          query.isActive = false;
        } else {
          query.status = englishStatus;
        }
      }

      if (search) {
        const regex = new RegExp(normalizePersianDigits(search), "i");
        query.$or = [
          { mobile: regex },
          { fname: regex },
          { lname: regex },
          { name: regex },
          { city: regex },
          { shopName: regex },
          { labName: regex },
          { address: regex },
        ];
      }

      totalUsers = await User.countDocuments(query);
      usersList = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    } catch (e) {
      console.error("[getUsers] Error fetching users:", e.message);
    }
  }

  if (!isDbConnected && usersList.length === 0 && !search && !roleFilter) {
    totalUsers = totalUsers || 3;
    usersList = [
      {
        _id: "u_1",
        mobile: "09123456789",
        fname: "علی",
        lname: "رضایی",
        role: "customer",
        city: "تهران",
        status: "active",
      },
      {
        _id: "u_2",
        mobile: "09351112233",
        fname: "محمد",
        lname: "کریمی",
        role: "lab",
        labName: "آزمایشگاه دقیق",
        city: "اصفهان",
        status: "active",
      }
    ];
  }

  return res.json({
    success: true,
    data: usersList,
    total: totalUsers,
    page,
    limit,
    totalPages: Math.ceil(totalUsers / limit) || 1,
  });
};

exports.createUser = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now() } });
  }

  const { mobile, fname, lname, role, companyName, shopName, labName, city, address } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: "شماره موبایل الزامی است." });

  try {
    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: "کاربر با این شماره موبایل وجود دارد." });
    }

    const newUser = await User.create({
      mobile,
      fname,
      lname,
      name: `${fname || ""} ${lname || ""}`.trim(),
      role: role || "customer",
      companyName,
      shopName,
      labName,
      city,
      address,
    });

    return res.json({ success: true, message: "کاربر با موفقیت ایجاد شد.", data: newUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ایجاد کاربر.", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now() } });
  }

  const { id, ...updateData } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "شناسه کاربر الزامی است." });

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updatedUser) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });

    return res.json({ success: true, message: "کاربر با موفقیت بروزرسانی شد.", data: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در بروزرسانی کاربر.", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now() } });
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "شناسه کاربر الزامی است." });

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });

    return res.json({ success: true, message: "کاربر با موفقیت حذف شد." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در حذف کاربر.", error: error.message });
  }
};
