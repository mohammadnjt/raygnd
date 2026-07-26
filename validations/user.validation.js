const Joi = require('joi');

// پایه مشترک (همیشه اجباری برای هر دو سطح)
const baseSchema = Joi.object({
  nationalCode: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'کد ملی باید دقیقاً ۱۰ رقم باشد',
      'any.required': 'کد ملی الزامی است'
    }),

  address: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'آدرس باید حداقل ۱۰ کاراکتر باشد',
      'string.max': 'آدرس نباید بیشتر از ۵۰۰ کاراکتر باشد',
      'any.required': 'آدرس الزامی است'
    }),

  postalCode: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'کد پستی باید دقیقاً ۱۰ رقم باشد',
      'any.required': 'کد پستی الزامی است'
    }),

  birthDate: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.format': 'فرمت تاریخ تولد باید YYYY-MM-DD باشد',
      'date.max': 'تاریخ تولد نمی‌تواند از امروز بیشتر باشد'
    })
    // اختیاری برای هر دو سطح
});

// فقط سطح ۲ — فقط پایه
const level2Schema = baseSchema;

// همکار — پایه + فیلدهای اجباری اضافی
const colleagueSchema = baseSchema.keys({
  licenseNumber: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'any.required': 'شماره پروانه کسب الزامی است',
      'string.min': 'شماره پروانه باید حداقل ۳ کاراکتر باشد',
      'string.max': 'شماره پروانه نباید بیشتر از ۵۰ کاراکتر باشد'
    }),

  businessName: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'any.required': 'نام کسب‌وکار الزامی است',
      'string.min': 'نام کسب‌وکار باید حداقل ۳ کاراکتر باشد',
      'string.max': 'نام کسب‌وکار نباید بیشتر از ۱۰۰ کاراکتر باشد'
    }),

  taxNumber: Joi.string()
    .pattern(/^\d+$/)
    .min(8)
    .max(15)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'شماره مالیاتی فقط عدد مجاز است',
      'string.min': 'شماره مالیاتی باید حداقل ۸ رقم باشد',
      'string.max': 'شماره مالیاتی نباید بیشتر از ۱۵ رقم باشد'
    })
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'نام باید حداقل ۲ کاراکتر باشد',
      'string.max': 'نام نباید بیشتر از ۱۰۰ کاراکتر باشد'
    }),

  lastName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'نام خانوادگی باید حداقل ۲ کاراکتر باشد',
      'string.max': 'نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد'
    }),

  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'ایمیل نامعتبر است'
    }),

  phone: Joi.string()
    .pattern(/^09[0-9]{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'شماره موبایل باید با ۰۹ شروع شود و دقیقاً ۱۱ رقم باشد'
    })
})
  .min(1) // حداقل یه فیلد باید بفرسته
  .messages({
    'object.min': 'حداقل یک فیلد برای بروزرسانی ارسال کنید'
  });

module.exports = {
  level2Schema,
  colleagueSchema,
  updateProfileSchema
};