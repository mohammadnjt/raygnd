const Joi = require('joi');

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'شماره موبایل باید معتبر باشد (مثل 09XXXXXXXXX)',
    'string.empty': 'شماره موبایل الزامی است'
  })
});

const verifySchema = Joi.object({
  phone: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'شماره موبایل باید معتبر باشد (مثل 09XXXXXXXXX)',
    'string.empty': 'شماره موبایل الزامی است'
  }),
  code: Joi.string().length(5).pattern(/^\d+$/).required().messages({
    'string.length': 'کد باید ۵ رقمی باشد',
    'string.pattern.base': 'کد باید فقط شامل اعداد باشد',
    'string.empty': 'کد الزامی است'
  })
});

const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'نام الزامی است',
    'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
    'string.max': 'نام نمی‌تواند بیشتر از ۵۰ کاراکتر باشد'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'نام خانوادگی الزامی است',
    'string.min': 'نام خانوادگی باید حداقل ۲ کاراکتر باشد',
    'string.max': 'نام خانوادگی نمی‌تواند بیشتر از ۵۰ کاراکتر باشد'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'فرمت ایمیل معتبر نیست'
  }),
  phone: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'شماره موبایل باید معتبر باشد (مثل 09XXXXXXXXX)',
    'string.empty': 'شماره موبایل الزامی است'
  }),
  // role: Joi.string().valid('admin', 'user', 'colleague').required().messages({
  //   'any.only': 'نقش کاربر باید یکی از موارد admin, user, colleague باشد',
  //   'any.required': 'نقش کاربر الزامی است'
  // })
});

// ولیدیتور جداگانه برای همکاران (برای مدارک)
const colleagueDocumentsSchema = Joi.object({
  nationalCard: Joi.string().uri().required().messages({
    'string.uri': ' کارت ملی باید معتبر باشد',
    'any.required': 'کارت ملی الزامی است'
  }),
  license: Joi.string().uri().required().messages({
    'string.uri': ' جواز کسب باید معتبر باشد',
    'any.required': 'جواز کسب الزامی است'
  }),
  bankCard: Joi.string().uri().required().messages({
    'string.uri': 'کارت بانکی باید معتبر باشد',
    'any.required': 'کارت بانکی الزامی است'
  }),
  additionalFiles: Joi.array().items(Joi.string().uri()).optional()
});

module.exports = {
  verifySchema,
  loginSchema,
  registerSchema,
  colleagueDocumentsSchema
};