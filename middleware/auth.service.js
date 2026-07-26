const crypto = require('crypto');
const User = require('../models/user.model');

class AuthService {
  // ایجاد کوکی امن
  static createAuthCookie(phone, purpose, res, additionalData = {}) {
    const authToken = crypto.randomBytes(32).toString('hex');
    const tokenId = crypto.randomBytes(16).toString('hex');
    
    const cookieOptions = {
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 دقیقه
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN,
      path: '/'
    };

    // کوکی امن برای سرور
    res.cookie('auth_token', authToken, cookieOptions);
    res.cookie('auth_purpose', purpose, cookieOptions);
    res.cookie('token_id', tokenId, cookieOptions);
    
    // کوکی برای دسترسی فرانت‌اند
    res.cookie('auth_phone', phone, { 
      ...cookieOptions, 
      httpOnly: false 
    });

    // داده‌های اضافی
    if (additionalData.userId) {
      res.cookie('auth_user_id', additionalData.userId.toString(), {
        ...cookieOptions,
        httpOnly: false
      });
    }

    return { authToken, tokenId };
  }

  // پاک کردن کوکی‌های احراز هویت
  static clearAuthCookies(res) {
    const options = {
      domain: process.env.COOKIE_DOMAIN,
      path: '/'
    };
    
    res.clearCookie('auth_token', options);
    res.clearCookie('auth_purpose', options);
    res.clearCookie('auth_phone', options);
    res.clearCookie('auth_user_id', options);
    res.clearCookie('token_id', options);
  }

  // ایجاد توکن JWT
  static createJWToken(user) {
    const jwt = require('jsonwebtoken');
    
    return jwt.sign(
      { 
        userId: user._id,
        phone: user.phone,
        role: user.role,
        tokenId: crypto.randomBytes(16).toString('hex')
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
  }

  // تنظیم کوکی JWT
  static setJWTCookie(token, res) {
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN,
      path: '/'
    };

    res.cookie('jwt', token, cookieOptions);
  }

  // بررسی کوکی احراز هویت
  static validateAuthCookie(req) {
    const authToken = req.cookies.auth_token;
    const authPurpose = req.cookies.auth_purpose;
    const authPhone = req.cookies.auth_phone;

    if (!authToken || !authPurpose || !authPhone) {
      throw new Error('دسترسی غیرمجاز. لطفاً فرآیند احراز هویت را از ابتدا آغاز کنید.');
    }

    return { authToken, authPurpose, authPhone };
  }

  // ایجاد کاربر جدید
  static async createUser(userData) {
    const user = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email || undefined,
      phone: userData.phone,
      role: userData.role || 'user',
      verified: false,
      status: 'pending',
      wallets: [
        { currency: 'GOLD', balance: 0 },
        { currency: 'USD', balance: 0 },
        { currency: 'IRT', balance: 0 },
        { currency: 'CREDIT', balance: 0 }
      ]
    });

    if (userData.role === 'colleague' && userData.documents) {
      user.documents = userData.documents;
    }

    await user.save();
    return user;
  }

  // پیدا کردن یا ایجاد کاربر
  static async findOrCreateUser(phone, userData = null) {
    let user = await User.findOne({ phone });

    if (!user && userData) {
      user = await this.createUser(userData);
    }

    return user;
  }

  // اعتبارسنجی OTP
  static async validateOTP(user, code, purpose) {
    if (!user.otp || !user.otp.code) {
      throw new Error('لطفاً ابتدا درخواست کد تأیید دهید.');
    }

    // بررسی هدف OTP
    if (user.otp.purpose !== purpose) {
      throw new Error('کد تأیید برای این عملیات معتبر نیست.');
    }

    // بررسی انقضا
    if (user.otp.expiresAt < new Date()) {
      user.otp = undefined;
      await user.save();
      throw new Error('کد تأیید منقضی شده است. لطفاً مجدداً درخواست دهید.');
    }

    // بررسی تعداد تلاش‌ها
    if (user.otp.attempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 دقیقه
      user.otp = undefined;
      await user.save();
      throw new Error('حساب شما به دلیل تلاش‌های ناموفق به مدت 30 دقیقه قفل شد.');
    }

    // بررسی صحت کد
    if (user.otp.code !== code) {
      user.otp.attempts += 1;
      await user.save();

      const remainingAttempts = 5 - user.otp.attempts;
      throw new Error(`کد وارد شده صحیح نیست. ${remainingAttempts} تلاش باقی مانده.`);
    }

    return true;
  }

  // تکمیل فرآیند احراز هویت
  static async completeAuthentication(user, purpose, req, res) {
    // حذف OTP استفاده شده
    user.otp = undefined;
    
    if (purpose === 'register') {
      user.verified = true;
      user.status = 'active';
    }

    user.lastLogin = new Date();
    await user.resetLoginAttempts();

    // لاگ فعالیت
    user.activityLog.push({
      action: purpose === 'register' ? 'register_complete' : 'login_success',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { purpose }
    });

    await user.save();

    // ایجاد توکن JWT
    const token = this.createJWToken(user);
    this.setJWTCookie(token, res);

    // پاک کردن کوکی‌های موقت
    this.clearAuthCookies(res);

    // حذف فیلدهای حساس از پاسخ
    const userResponse = user.toObject();
    delete userResponse.otp;
    delete userResponse.loginAttempts;
    delete userResponse.lockUntil;

    return { user: userResponse, token };
  }
}

module.exports = AuthService;