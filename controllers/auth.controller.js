const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const redis = require("../scripts/redis");
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

function normalizeMobile(mobileStr) {
  if (!mobileStr) return "";
  let s = normalizePersianDigits(mobileStr).trim();
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  if (s.startsWith("0098")) s = "0" + s.slice(4);
  if (s.startsWith("98") && s.length === 12) s = "0" + s.slice(2);
  if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return s;
}

function sanitizeUser(userObj) {
  if (!userObj) return userObj;
  const user = typeof userObj.toObject === 'function' ? userObj.toObject() : { ...userObj };
  if (user.role === "customer" || user.role === "superAdmin") {
    delete user.companyName;
    delete user.companyPhone;
    delete user.companyAddress;
    delete user.companyScore;
  }

  if (user.avatar && !user.avatar.startsWith('http')) {
    const domain = process.env.DOMAIN_URL || "https://raygnd.blhgroups.ir";
    user.avatar = `${domain}${user.avatar}`;
  }

  return user;
}

exports.login = async (req, res) => {
  const rawMobile = req.body.username || req.body.mob || req.body.mobile || "09123456789";
  const mobile = normalizeMobile(rawMobile);

  const rateKey = `otp_count:${mobile}`;
  let currentCount = 0;

  try {
    const countStr = await redis.get(rateKey);
    currentCount = countStr ? parseInt(countStr, 10) : 0;
  } catch (e) {}

  if (currentCount >= 5) {
    return res.status(429).json({
      success: false,
      message: "شما بیش از ۵ بار در ۲ ساعت گذشته کد تایید دریافت کرده‌اید. لطفا بعداً تلاش کنید.",
    });
  }

  try {
    if (currentCount === 0) {
      await redis.set(rateKey, "1", "EX", 7200);
    } else {
      await redis.incr(rateKey);
    }
    await redis.set(`otp:${mobile}`, "12345", "EX", 300);
  } catch (e) {}

  let dbUser = null;
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    dbUser = await User.findOne({ mobile }).lean();
  }

  return res.json({
    success: true,
    message: "کد تایید برای شما ارسال شد",
    code: 12345,
    user: sanitizeUser(dbUser || {
      id: Date.now(),
      mobile,
      fname: "کاربر",
      lname: mobile.slice(-4),
      role: "customer",
    }),
  });
};

exports.verify = async (req, res) => {
  const code = req.body.code;
  const rawMobile = req.body.username || req.body.mob || req.body.mobile || "09123456789";
  const mobile = normalizeMobile(rawMobile);

  let storedOtp = null;
  try {
    storedOtp = await redis.get(`otp:${mobile}`);
  } catch (e) {}

  if (!storedOtp) {
    return res.json({
      success: false,
      message: "کد تایید منقضی شده یا درخواست نشده است.",
    });
  }

  if (!code || String(code) !== String(storedOtp)) {
    return res.json({
      success: false,
      message: "کد وارد شده نامعتبر است.",
    });
  }

  // Delete OTP after successful verification
  try {
    await redis.del(`otp:${mobile}`);
  } catch(e) {}

  let targetUser = null;
  const cleanMobile = String(mobile).trim();
  const defaultRole = cleanMobile === "09121112233" ? "superAdmin" : "customer";
  
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    if (isDbConnected) {
      targetUser = await User.findOne({ mobile: cleanMobile });
      if (!targetUser) {
        targetUser = await User.create({
          mobile: cleanMobile,
          role: defaultRole,
        });
      }
    }
  } catch (e) {
    if (e.code === 11000 && isDbConnected) {
      targetUser = await User.findOne({ mobile: cleanMobile });
    }
  }

  const userId = targetUser ? targetUser._id : `user_${mobile}`;
  const userRole = targetUser ? targetUser.role : defaultRole;

  const token = jwt.sign(
    {
      userId,
      mobile,
      role: userRole,
    },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "30d" }
  );

  const fallbackUser = {
    id: Date.now(),
    mobile,
    fname: "کاربر",
    lname: mobile.slice(-4),
    role: "customer",
  };

  return res.json({
    success: true,
    message: "ورود موفقیت‌آمیز بود",
    token,
    user: sanitizeUser(targetUser || fallbackUser),
  });
};

exports.getProfile = async (req, res) => {
  let user = req.user;
  const isDbConnected = mongoose.connection.readyState === 1;
  
  if (isDbConnected) {
    try {
      const dbUser = await User.findById(user._id).populate('companyId').lean();
      if (dbUser) {
          if (dbUser.companyId) {
              dbUser.companyName = dbUser.companyId.name;
              dbUser.companyPhone = dbUser.companyId.phone;
              dbUser.companyAddress = dbUser.companyId.address;
              dbUser.companyScore = dbUser.companyId.score;
              dbUser.companyId = dbUser.companyId._id;
          }
          user = dbUser;
      }
    } catch (e) {}
  }

  return res.json({
    success: true,
    data: sanitizeUser(user),
  });
};

exports.updateCompanySettings = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(503).json({ success: false, message: "ارتباط با دیتابیس برقرار نیست." });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });
    if (!user.companyId) return res.status(404).json({ success: false, message: "شما مجموعه‌ای ثبت نکرده‌اید." });

    const { workingHours } = req.body;
    const updateData = {};
    if (workingHours !== undefined) {
      if (typeof workingHours !== 'object' || Array.isArray(workingHours) || workingHours === null) {
        return res.status(400).json({ success: false, message: "فرمت workingHours نامعتبر است. باید یک آبجکت باشد." });
      }
      
      const validDays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
      for (const day in workingHours) {
        if (!validDays.includes(day)) {
           return res.status(400).json({ success: false, message: `روز نامعتبر: ${day}` });
        }
        if (!Array.isArray(workingHours[day])) {
           return res.status(400).json({ success: false, message: `تایم‌های کاری روز ${day} باید آرایه باشد.` });
        }
        for (const time of workingHours[day]) {
          if (typeof time !== 'string' || !time.includes('-')) {
             return res.status(400).json({ success: false, message: `فرمت تایم کاری نامعتبر است: ${time}. باید به فرمت 10:00-11:00 باشد.` });
          }
        }
      }
      updateData.workingHours = workingHours;
    }

    await Company.findByIdAndUpdate(user.companyId, updateData);
    
    return res.json({ success: true, message: "تنظیمات با موفقیت ذخیره شد." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ذخیره تنظیمات." });
  }
};

exports.updateProfile = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(503).json({ success: false, message: "ارتباط با دیتابیس برقرار نیست." });
  }

  try {
    const updateData = {};
    const { companyName, companyPhone, companyAddress } = req.body;
    const allowedFields = ["fname", "lname", "city", "address", "phone"];
    
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.avatar !== undefined) {
      let avatarUrl = req.body.avatar;
      // Strip domain if present
      if (avatarUrl.startsWith('http')) {
        try {
          const urlObj = new URL(avatarUrl);
          avatarUrl = urlObj.pathname;
        } catch(e) {
          // Ignore invalid URL
        }
      }
      
      // If it's from tmp, move it
      if (avatarUrl.startsWith('/uploads/tmp/')) {
        const path = require('path');
        const fs = require('fs');
        const filename = path.basename(avatarUrl);
        const tmpPath = path.join(__dirname, '..', avatarUrl);
        const profileDir = path.join(__dirname, '../uploads/profile');
        const newPath = path.join(profileDir, filename);
        
        if (fs.existsSync(tmpPath)) {
          if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
          }
          fs.renameSync(tmpPath, newPath);
          updateData.avatar = `/uploads/profile/${filename}`;
        } else {
          updateData.avatar = avatarUrl;
        }
      } else {
        updateData.avatar = avatarUrl;
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });
    
    Object.assign(user, updateData);
    
    if (user.role === "gold" || user.role === "lab") {
        if (user.companyId) {
            await Company.findByIdAndUpdate(user.companyId, {
                mode: user.role === "gold" ? "shop" : "lab",
                name: companyName !== undefined ? companyName : undefined,
                phone: companyPhone !== undefined ? companyPhone : undefined,
                address: companyAddress !== undefined ? companyAddress : undefined,
            }, { omitUndefined: true });
        } else if (companyName) {
            const company = await Company.create({
                mode: user.role === "gold" ? "shop" : "lab",
                name: companyName,
                phone: companyPhone || "",
                address: companyAddress || "",
                owner: user._id
            });
            user.companyId = company._id;
        }
    }

    await user.save();
    
    const updatedUser = await User.findById(req.user._id).populate('companyId').lean();
    if (updatedUser.companyId) {
        updatedUser.companyName = updatedUser.companyId.name;
        updatedUser.companyPhone = updatedUser.companyId.phone;
        updatedUser.companyAddress = updatedUser.companyId.address;
        updatedUser.companyScore = updatedUser.companyId.score;
        updatedUser.companyId = updatedUser.companyId._id;
    }
    
    return res.json({
      success: true,
      message: "پروفایل با موفقیت بروزرسانی شد",
      data: sanitizeUser(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در بروزرسانی پروفایل." });
  }
};
