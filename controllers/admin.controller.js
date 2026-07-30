const User = require("../models/user.model");
const Company = require("../models/company.model");
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
  const isActiveFilter = req.query.isActive;

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
        if (roleFilter === "مدیر کل" || roleFilter === "سوپر ادمین") englishRole = "superAdmin";
        query.role = englishRole;
      }

      if (isActiveFilter !== undefined && isActiveFilter !== "all" && isActiveFilter !== "") {
        if (isActiveFilter === "true" || isActiveFilter === true) {
          query.isActive = { $ne: false };
        } else if (isActiveFilter === "false" || isActiveFilter === false) {
          query.isActive = false;
        }
      }

      if (search) {
        const regex = new RegExp(normalizePersianDigits(search), "i");
        query.$or = [
          { mobile: regex },
          { fname: regex },
          { lname: regex },
          { city: regex },
          { address: regex },
        ];
      }

      totalUsers = await User.countDocuments(query);
      const foundUsers = await User.find(query).populate('companyId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      usersList = foundUsers.map(user => {
        const u = { ...user };
        if (u.companyId) {
            u.companyName = u.companyId.name;
            u.companyPhone = u.companyId.phone;
            u.companyAddress = u.companyId.address;
            u.companyScore = u.companyId.score;
            u.companyId = u.companyId._id;
        }
        return u;
      });
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
        isActive: true,
      },
      {
        _id: "u_2",
        mobile: "09351112233",
        fname: "محمد",
        lname: "کریمی",
        role: "lab",
        companyName: "آزمایشگاه دقیق",
        city: "اصفهان",
        isActive: true,
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

  const { mobile, fname, lname, role, companyName, companyPhone, companyAddress, companyScore, city, address } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: "شماره موبایل الزامی است." });

  try {
    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: "کاربر با این شماره موبایل وجود دارد." });
    }

    const newUser = new User({
      mobile,
      fname,
      lname,
      role: role || "customer",
      city,
      address,
    });
    
    if ((role === "gold" || role === "lab") && companyName) {
        const company = await Company.create({
            mode: role === "gold" ? "shop" : "lab",
            name: companyName,
            phone: companyPhone || "",
            address: companyAddress || "",
            score: companyScore || 0,
            owner: newUser._id
        });
        newUser.companyId = company._id;
    }
    await newUser.save();
    
    const responseUser = newUser.toObject();
    if (responseUser.companyId) {
        responseUser.companyName = companyName;
        responseUser.companyPhone = companyPhone;
        responseUser.companyAddress = companyAddress;
        responseUser.companyScore = companyScore;
    }

    return res.json({ success: true, message: "کاربر با موفقیت ایجاد شد.", data: responseUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ایجاد کاربر.", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: { _id: Date.now() } });
  }

  const { id, companyName, companyPhone, companyAddress, companyScore, ...updateData } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "شناسه کاربر الزامی است." });

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });
    
    Object.assign(user, updateData);
    
    if (user.role === "gold" || user.role === "lab") {
        if (user.companyId) {
            await Company.findByIdAndUpdate(user.companyId, {
                mode: user.role === "gold" ? "shop" : "lab",
                name: companyName !== undefined ? companyName : undefined,
                phone: companyPhone !== undefined ? companyPhone : undefined,
                address: companyAddress !== undefined ? companyAddress : undefined,
                score: companyScore !== undefined ? companyScore : undefined,
            }, { omitUndefined: true });
        } else {
            if (!companyName) return res.status(400).json({ success: false, message: "جهت تغییر نقش، وارد کردن نام مجموعه الزامی است." });
            const company = await Company.create({
                mode: user.role === "gold" ? "shop" : "lab",
                name: companyName,
                phone: companyPhone || "",
                address: companyAddress || "",
                score: companyScore || 0,
                owner: user._id
            });
            user.companyId = company._id;
        }
    }
    
    await user.save();
    
    const updatedUser = await User.findById(id).populate('companyId').lean();
    if (updatedUser.companyId) {
        updatedUser.companyName = updatedUser.companyId.name;
        updatedUser.companyPhone = updatedUser.companyId.phone;
        updatedUser.companyAddress = updatedUser.companyId.address;
        updatedUser.companyScore = updatedUser.companyId.score;
        updatedUser.companyId = updatedUser.companyId._id;
    }

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
