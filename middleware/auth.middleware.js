const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AuthService = require('../middleware/auth.service');
const blhLog = require('./logger.middleware');

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('token',token)
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'دسترسی غیرمجاز. توکن ارائه نشده است'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('decoded',decoded)
    req.user = await User.findById(decoded.userId);
    console.log('req.user',req.user)
    req.userId = decoded.userId||req.user._id;
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'توکن نامعتبر است'
      });
    }

    if (!req.user.status) {
      return res.status(403).json({
        success: false,
        message: 'حساب کاربری غیرفعال شده است'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    res.status(401).json({
      success: false,
      message: 'توکن نامعتبر است'
    });
  }
};

// میدلور بررسی کوکی احراز هویت
exports.requireAuthCookie = async (req, res, next) => {
  try {
    const { authPhone, authPurpose } = AuthService.validateAuthCookie(req);
    console.log(authPhone,'object', authPurpose)
    req.authPhone = authPhone;
    req.authPurpose = authPurpose;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        cookiesReceived: req.cookies
      } : undefined
    });
  }
};

exports.authenticate = async (req, res, next) => {
  try {
    let token;

    // بررسی توکن از هدر Authorization یا کوکی
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // console.log(req.header('blh') !== 'blh','req.header',req.header('blh'))
      if(req.header('blh') !== 'blh') return res.status(403).json('ok');
      token = req.headers.authorization.split(' ')[1]; // برای پست من
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'لطفاً وارد سیستم شوید'
      });
    }

    // بررسی اعتبار توکن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // پیدا کردن کاربر
    const currentUser = await User.findById(decoded.userId)
      .select('-loginAttempts -lockUntil -activityLog');

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'کاربر مربوط به این توکن وجود ندارد'
      });
    }

    // بررسی وضعیت کاربر
    if (currentUser.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است'
      });
    }

    // اضافه کردن کاربر به request
    req.user = currentUser;
    req.userId = currentUser._id;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'توکن معتبر نیست'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'توکن منقضی شده است'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطا در احراز هویت'
    });
  }
};

exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'لطفاً ابتدا وارد سیستم شوید'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی به این بخش را ندارید. فقط ادمین مجاز است.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در بررسی دسترسی'
    });
  }
};


// میدلور برای بررسی نقش کاربر
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی به این عملیات را ندارید'
      });
    }
    next();
  };
};
// // میدلور بررسی توکن احراز هویت
// const verifyToken = async (req, res, next) => {
//   const token = req.headers['x-access-token'] || req.headers['authorization'];
  
//   if (!token) {
//     return res.status(403).json({ message: 'Authentication token not provided.' });
//   }

//   try {
//     const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'your-secret-key');
//     // blhLog("decoded", decoded)
//     req.user =  await User.findById(decoded.id, 'username fullName email role profileImage isActive');
//     req.userId = decoded.id;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: 'The token is invalid.' });
//   }
// };

// // میدلور بررسی نقش ادمین
// const isAdmin = async (req, res, next) => {
//   try {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Access is restricted. Requires admin role.' });
//     }
    
//     next();
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };


// module.exports = {
//   verifyToken,
//   isAdmin,
// };