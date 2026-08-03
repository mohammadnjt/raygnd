# مستندات API سامانه رایگ

تمامی مسیرها با پیشوند `/api` شروع می‌شوند. برای مسیرهایی که نیاز به احراز هویت دارند، ارسال هدر `Authorization: Bearer <TOKEN>` الزامی است.

---

## 1. احراز هویت (Auth)

### ورود / درخواست کد (Login)
- **آدرس:** `POST /api/auth/login`
- **ورودی (JSON):**
```json
{
  "mobile": "09123456789"
}
```

### تایید کد و دریافت توکن (Verify)
- **آدرس:** `POST /api/auth/verify`
- **ورودی (JSON):**
```json
{
  "mobile": "09123456789",
  "code": "12345"
}
```

### دریافت پروفایل کاربری (Get Profile)
- **آدرس:** `GET /api/auth/profile`
- **نیاز به توکن:** دارد

### ویرایش پروفایل کاربری (Update Profile)
- **آدرس:** `POST /api/auth/profile`
- **نیاز به توکن:** دارد
- **ورودی نمونه (JSON):**
```json
{
  "fname": "علی",
  "lname": "رضایی",
  "city": "تهران",
  "shopName": "طلافروشی رضایی"
}
```

---

## 2. استعلام طلا (Inquiry)

### استعلام کد ری‌گیری (Inquiry - GET/POST)
- **آدرس:** `GET /api/inquiry` یا `POST /api/inquiry`
- **نیاز به توکن:** اختیاری (برای ثبت در تاریخچه در صورت وجود توکن)
- **پارامتر GET:** `?angCode=123456`
- **ورودی POST (JSON):**
```json
{
  "angCode": "123456"
}
```

### تاریخچه استعلام‌ها (History)
- **آدرس:** `GET /api/inquiry/history`
- **نیاز به توکن:** دارد

### افزودن به نشان‌شده‌ها (Add Bookmark)
- **آدرس:** `POST /api/inquiry/bookmarks/add`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "angCode": "123456",
  "title": "سفارش مشتری فلانی",
  "labName": "تست",
  "purity": "750"
}
```

### حذف از نشان‌شده‌ها (Remove Bookmark)
- **آدرس:** `POST /api/inquiry/bookmarks/remove`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "angCode": "123456"
}
```

### لیست نشان‌شده‌ها (Get Bookmarks)
- **آدرس:** `GET /api/inquiry/bookmarks`
- **نیاز به توکن:** دارد

---

## 3. پشتیبانی و تیکت (Ticket)

### ایجاد تیکت جدید (Create Ticket)
- **آدرس:** `POST /api/ticket/create`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "title": "مشکل در ثبت سفارش",
  "department": "پشتیبانی فنی",
  "priority": "high",
  "message": "سلام، در مرحله تایید خطای سیستم میده."
}
```

### لیست تیکت‌ها (List Tickets)
- **آدرس:** `GET /api/ticket/list`
- **نیاز به توکن:** دارد
- **پارامترهای GET (اختیاری):** `?page=1&limit=10&status=open&search=مشکل`

### جزئیات تیکت (Ticket Details)
- **آدرس:** `GET /api/ticket/detail`
- **نیاز به توکن:** دارد
- **پارامتر GET:** `?id=TCK-123456` (شناسه یا کد تیکت)

### ارسال پیام در تیکت (Send Message)
- **آدرس:** `POST /api/ticket/message`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "ticketId": "TCK-123456",
  "message": "ممنون از پیگیری شما."
}
```

### بستن تیکت (Close Ticket)
- **آدرس:** `POST /api/ticket/close`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "ticketId": "TCK-123456",
  "status": "closed"
}
```

---

## 4. مدیریت کاربران - ویژه مدیر (Admin)

### دریافت لیست کاربران (Get Users)
- **آدرس:** `GET /api/admin/users`
- **نیاز به توکن:** دارد (فقط نقش admin و superAdmin)
- **پارامترهای GET (اختیاری):** `?page=1&limit=10&search=علی&role=customer&isActive=true`

### ایجاد کاربر جدید (Create User)
- **آدرس:** `POST /api/admin/users/create`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "mobile": "09301112233",
  "fname": "رضا",
  "lname": "کریمی",
  "role": "gold",
  "companyName": "طلاسازی کریمی",
  "city": "اصفهان"
}
```

### ویرایش کاربر (Update User)
- **آدرس:** `POST /api/admin/users/update`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "id": "شناسه_کاربر (ObjectId)",
  "fname": "نام جدید",
  "isActive": false
}
```

### حذف کاربر (Delete User)
- **آدرس:** `POST /api/admin/users/delete`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "id": "شناسه_کاربر (ObjectId)"
}
```

---

## 5. سفارشات، آزمایشگاه‌ها و درخواست‌ها (General)

### لیست سفارشات کاربر/آزمایشگاه (Get Orders)
- **آدرس:** `GET /api/general/orders`
- **پارامترهای GET (اختیاری):** `?page=1&limit=10&search=کد`
- **نیاز به توکن:** دارد
- **توضیحات:** لیست سفارشات کاربر (یا آزمایشگاه) را برمی‌گرداند. فیلد `manual: true` نشان‌دهنده سفارشی است که توسط خود آزمایشگاه ثبت شده است. فیلدهای `weight` (وزن اولیه) و `weightReceived` (وزن دریافتی در آزمایشگاه) به همراه سایر جزئیات در خروجی قرار دارند.
- **نمونه خروجی:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a6aa...",
      "orderNumber": "ORD-123456",
      "status": "pending",
      "manual": false,
      "description": "توضیحات سفارش",
      "weight": 50.5,
      "weightReceived": 0,
      "lab": {
        "_id": "6a...",
        "name": "آزمایشگاه تهران"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### ثبت کد انگ روی سفارش (Assign Ang)
- **آدرس:** `POST /api/general/orders/assign-ang`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "orderId": "ORD-123456",
  "stampCode": "A998877",
  "purity": "750"
}
```
- **توضیحات:** 
  - در صورتی که برای سفارش قبلا کد انگ ثبت شده باشد (تکراری بودن `orderId`) سیستم خطا می‌دهد.
  - در صورتی که کد انگ (`stampCode`) ارسالی، قبلا توسط همین آزمایشگاه و با همین عیار ثبت شده باشد، سیستم خطا می‌دهد.

### تحویل سفارش (Deliver Order)
- **آدرس:** `POST /api/general/orders/deliver`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "orderId": "ORD-123456",
  "deliveredWeight": 150.5
}
```

### لیست آزمایشگاه‌های فعال (Get Labs)
- **آدرس:** `GET /api/general/labs`
- **پارامترهای GET (اختیاری):** `?page=1&limit=10&search=نام`
- **نیاز به توکن:** دارد

### لیست اعلانات (Notifications)
- **آدرس:** `GET /api/general/notifications`
- **نیاز به توکن:** دارد

### ثبت درخواست پروژه (Submit Project Request)
- **آدرس:** `POST /api/general/requests/project`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "title": "درخواست ساخت قطعه",
  "description": "توضیحات مربوط به درخواست ساخت...",
  "phone": "09123456789"
}
```

### ثبت درخواست اجاره تجهیزات (Submit Rental Request)
- **آدرس:** `POST /api/general/requests/rental`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "equipment": "دستگاه ری‌گیری XRF",
  "duration": "3 روز",
  "phone": "09123456789"
}
```

---

## 6. آپلود فایل (Upload)

### آپلود تصویر و دریافت لینک (Upload File)
- **آدرس:** `POST /api/upload`
- **نیاز به توکن:** دارد
- **ساختار درخواست:** `multipart/form-data`
- **پارامتر ارسالی:**
  - `file`: فایل تصویری (فرمت‌های مجاز: `jpg, jpeg, png, gif, webp`)
  - `type` (اختیاری): نوع آپلود (مثلاً `profile`)

- **توضیحات مهم برای تصویر پروفایل:**
  فایل‌های آپلود شده ابتدا در پوشه موقت (`/uploads/tmp`) ذخیره می‌شوند. در پاسخ این API یک لینک کامل (url) دریافت می‌کنید.
  برای ثبت نهایی تصویر پروفایل، باید لینک دریافت شده را در API مربوط به `آپدیت پروفایل کاربری` (مسیر `PUT /api/auth/profile`) در فیلد `avatar` ارسال کنید.
  سیستم به صورت خودکار تصویر را از پوشه موقت به پوشه دائمی منتقل کرده و آدرس آن را در دیتابیس ذخیره می‌کند.
  اگر تصویر آپلود شود اما در پروفایل ثبت نگردد، پس از گذشت ۲۴ ساعت به صورت خودکار از پوشه موقت پاک می‌شود.

- **نمونه خروجی:**
```json
{
  "success": true,
  "message": "فایل با موفقیت آپلود شد.",
  "data": {
    "path": "/uploads/tmp/168972...-348.jpg",
    "url": "https://raygnd.blhgroups.ir/uploads/tmp/168972...-348.jpg"
  }
}
```

### اطلاعات اپلیکیشن (About Us & Banners)
- **آدرس:** `GET /api/version`
- **نیاز به توکن:** ندارد
- **خروجی:**
```json
{
  "success": true,
  "version": "1.0.0",
  "aboutUs": {
    "title": "درباره ما",
    "description": "...",
    "contactEmail": "info@example.com",
    "contactPhone": "021-12345678"
  },
  "banners": [
    "https://example.com/banner1.jpg"
  ]
}
```

### داشبورد (Dashboard - Top Labs)
- **آدرس:** `GET /api/general/dashboard`
- **نیاز به توکن:** ندارد (عمومی)
- **خروجی:** لیست ۵ آزمایشگاه برتر بر اساس نمره.
```json
{
  "success": true,
  "topLabs": [
    {
      "_id": "...",
      "labName": "آزمایشگاه طلا",
      "labPhone": "...",
      "labAddress": "...",
      "labScore": 5,
      "ownerId": "..."
    }
  ]
}
```

## معرفی (Referrals)
برای معرفی کردن طلافروشان و آزمایشگاه‌ها توسط خودشان و همچنین مشاهده لیست.

### ایجاد معرفی
- **آدرس:** `POST /api/referrals/create`
- **نیاز به توکن:** دارد (فقط نقش‌های `gold` و `lab`)
- **ورودی (JSON):**
```json
{
  "targetMode": "gold", // یا lab
  "targetMobile": "09123456789",
  "targetFname": "نام",
  "targetLname": "نام خانوادگی",
  "targetCompanyName": "نام فروشگاه/آزمایشگاه",
  "targetCompanyPhone": "021123456",
  "targetCompanyAddress": "آدرس",
  "targetCity": "تهران"
}
```

### لیست معرفی‌ها
- **آدرس:** `GET /api/referrals`
- **نیاز به توکن:** دارد
- **پارامترهای GET (اختیاری):** `?page=1&limit=10&status=pending` (status فقط برای ادمین کل کار می‌کند)
- **توضیحات:** کاربران فقط معرفی‌های خود را می‌بینند. ادمین کل همه را می‌بیند.

### تایید معرفی (ادمین کل)
- **آدرس:** `POST /api/referrals/approve`
- **نیاز به توکن:** دارد (فقط `superAdmin`)
- **ورودی (JSON):**
```json
{
  "id": "شناسه معرفی"
}
```

### رد معرفی (ادمین کل)
- **آدرس:** `POST /api/referrals/reject`
- **نیاز به توکن:** دارد (فقط `superAdmin`)
- **ورودی (JSON):**
```json
{
  "id": "شناسه معرفی",
  "reason": "دلیل رد شدن"
}
```

### درخت معرفی‌ها (ادمین کل)
- **آدرس:** `GET /api/referrals/tree`
- **نیاز به توکن:** دارد (فقط `superAdmin`)

### استعلام ری‌گیری (آپدیت)
- **آدرس:** `GET /api/inquiry`
- **پارامترهای GET:** `?angCode=26007`
- **خروجی (JSON):**
در نسخه جدید خروجی به صورت آرایه از داده‌ها برگشت داده می‌شود (حتی اگر یکی باشد):
```json
{
  "success": true,
  "message": "استعلام با موفقیت انجام شد.",
  "data": [
    {
      "code": "26007",
      "customer": "استادی",
      "labName": "آزمایشگاه طلا",
      "labPhone": "نامشخص",
      "purity": "750",
      "date": "نامشخص",
      "source": "raygir"
    },
    {
      "code": "26007",
      "customer": "شادمهری",
      "labName": "آزمایشگاه سنجش",
      "labPhone": "نامشخص",
      "purity": "740",
      "date": "نامشخص",
      "source": "msanjesh"
    }
  ]
}
```

### ثبت امتیاز برای طلافروشی یا آزمایشگاه (Rate Company)
- **آدرس:** `POST /api/general/rate-company`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "companyId": "شناسه_مجموعه (ObjectId)",
  "score": 4.5,
  "comment": "توضیحات و نظر کاربر"
}
```
- **توضیحات:** هر کاربر تنها یک بار می‌تواند به هر مجموعه امتیاز دهد. امتیاز باید عددی بین ۰ تا ۵ باشد. پس از ثبت، میانگین امتیازات مجموعه به‌روزرسانی می‌شود.

### تنظیمات زمان‌بندی آزمایشگاه (Company Settings)
- **آدرس:** `POST /api/auth/company/settings`
- **نیاز به توکن:** دارد (کاربر باید مدیر آزمایشگاه/طلاساز باشد)
- **ورودی (JSON):**
```json
{
  "workingHours": {
    "sat": ["10:00-11:00", "11:00-12:00"],
    "sun": ["10:00-11:00", "11:00-12:00"],
    "mon": ["10:00-11:00", "11:00-12:00"],
    "tue": ["10:00-11:00", "11:00-12:00"],
    "wed": ["10:00-11:00", "11:00-12:00"]
  }
}
```
- **توضیحات:** در فیلد `workingHours` برنامه کاری هر روز مشخص می‌شود. اگر روزی در این آبجکت وجود نداشته باشد یا آرایه آن خالی باشد، به معنای تعطیل بودن آزمایشگاه در آن روز است.

### دریافت تنظیمات و زمان‌های خالی آزمایشگاه (Get Lab Settings)
- **آدرس:** `GET /api/general/labs/:id/settings`
- **پارامترهای GET (اختیاری):** `?date=1405/07/15`
- **نیاز به توکن:** دارد
- **توضیحات:** این API برنامه کاری آزمایشگاه را برمی‌گرداند. در صورتی که `date` ارسال شود، بررسی می‌کند کدام تایم‌ها در آن روز رزرو شده‌اند و مقدار `reserv` را `true` برمی‌گرداند.
- **نمونه خروجی:**
```json
{
  "success": true,
  "lab": {
    "_id": "6a6aa...",
    "labName": "آزمایشگاه تهران",
    "workingHours": {
      "sun": [
        {
          "start": "10:00",
          "end": "11:00",
          "reserv": false
        },
        {
          "start": "11:00",
          "end": "12:00",
          "reserv": true
        }
      ]
    }
  }
}
```

### ثبت درخواست نوبت (Request Order)
- **آدرس:** `POST /api/general/orders/request`
- **نیاز به توکن:** دارد
- **ورودی (JSON):**
```json
{
  "labId": "6a6aa...",
  "selectedDate": "1405/07/15",
  "selectedTime": "10:00-11:30",
  "meltMethod": "traditional",
  "assayMethod": "fireAssay",
  "description": "توضیحات اختیاری",
  "weight": 50.5,
  "hasJewel": false
}
```
- **توضیحات:** اگر آزمایشگاه برای خودش نوبت ثبت کند، سیستم به صورت خودکار `manual: true` را اعمال می‌کند.
- **نمونه خروجی:**
```json
{
  "success": true,
  "data": {
    "_id": "6a6aa476...",
    "orderNumber": "ORD-123456",
    "lab": {
      "_id": "6a6aa...",
      "name": "آزمایشگاه تهران"
    },
    "selectedDate": "1405/07/15",
    "selectedTime": "10:00-11:30",
    "meltMethod": "traditional",
    "assayMethod": "fireAssay",
    "description": "توضیحات اختیاری",
    "weight": 50.5,
    "hasJewel": false,
    "manual": true
  }
}
```

### دریافت لیست سفارشات (Get Orders)
- **آدرس:** `GET /api/general/orders`
- **نیاز به توکن:** دارد
- **پارامترهای اختیاری GET:**
  - `page`: شماره صفحه (پیش‌فرض 1)
  - `limit`: تعداد در هر صفحه (پیش‌فرض 10)
  - `search`: جستجو بر اساس شماره سفارش یا کد انگ (`stampCode`)
- **توضیحات:** لیست سفارشات کاربر جاری یا آزمایشگاه مربوطه را برمی‌گرداند. برای سفارشاتی که مرحله دریافت (`received`) را رد کرده یا در وضعیت‌های بعدی قرار دارند، در صورت خالی بودن `pieces` یا عدم وجود انگ، یک کد انگ ۵ رقمی یکتا و پیشنهادی مخصوص آن آزمایشگاه (مانند `Aa12345`) به آرایه `pieces` اضافه و در دیتابیس ذخیره می‌گردد. همچنین با ارشیو شدن سفارش (`status: archived`)، کد انگ در کالکشن `Ang` ثبت می‌شود.

### به‌روزرسانی وضعیت و جزئیات سفارش (Update Order)
- **آدرس:** `POST /api/general/orders/:id/update`
- **نیاز به توکن:** دارد
- **توضیحات:** آزمایشگاه با استفاده از این API می‌تواند در مراحل مختلف مقادیر مربوط به سفارش را پر کرده و وضعیت (status) آن را تغییر دهد.
  - **مرحله دریافت (`received`):** در این مرحله، در صورتی که فیلد `pieces` فاقد کد انگ باشد، یک کد انگ اختصاصی یکتا برای آن آزمایشگاه تولید شده و به قطعه اول اختصاص داده می‌شود.
  - **اعتبارسنجی یکتایی انگ:** کدهای انگ ثبت‌شده در `pieces` مجاز به داشتن همپوشانی و تکرار در سطح همان آزمایشگاه نیستند و در صورت وجود کد تکراری در آن آزمایشگاه، ارور 400 برگردانده می‌شود.

### استعلام / بررسی تکراری نبودن کد انگ در آزمایشگاه (Verify Ang)
- **آدرس:** `POST /api/general/orders/verify-ang` یا `GET /api/general/orders/verify-ang`
- **نیاز به توکن:** دارد
- **توضیحات:** بررسی یکتایی کد انگ برای یک آزمایشگاه.
- **پارامترهای ورودی (Query یا JSON):**
  - `angCode` یا `ang`: کد انگ جهت بررسی (مثال: `"Aa23777"`)
  - `labId` (اختیاری): شناسه آزمایشگاه (در صورت عدم ارسال، از `companyId` کاربر لاگین‌شده استفاده می‌شود)
  - `orderId` (اختیاری): شناسه سفارش در حال ویرایش (برای مستثنی کردن همان سفارش)
- **نمونه خروجی معتبر (غیرتکراری):**
```json
{
  "success": true,
  "isDuplicate": false,
  "message": "کد انگ معتبر است و تکراری نیست"
}
```
- **نمونه خروجی تکراری:**
```json
{
  "success": false,
  "isDuplicate": true,
  "message": "این کد انگ قبلا در این آزمایشگاه ثبت شده است"
}
```
- **ورودی (JSON) - مقادیر اختیاری بر اساس مرحله:**
```json
{
  "status": "confirmed", // "pending" | "cancelled" | "confirmed" | "received" | "melted" | "delivered" | "archived" | "completed"
  "weight": 150,
  "description": "",
  "wageType": "gram", // "gram" | "toman" | "percent"
  "wageValue": 15,
  "totalPrice": 1000000,
  "extraServices": [
    { "title": "خدمات 1", "price": 50000 }
  ],
  "weightReceived": 150,
  "imgReceived": "/uploads/gold/img.jpg",
  "pieces": [
    {
      "weight": 10,
      "dimensions": { "length": 15, "width": 10, "thickness": 2 },
      "img": "/uploads/gold/piece.jpg",
      "ang": "12345"
    }
  ],
  "deliveryType": "final",
  "deductions": 15,
  "deliveredWeight": 135,
  "purity": 750,
  "trustWeight": 15,
  "sampleDelivered": true,
  "isPay": true
}
```
- **نمونه خروجی:**
```json
{
  "success": true,
  "message": "سفارش با موفقیت به‌روزرسانی شد",
  "data": {
    "_id": "6a6aa...",
    "orderNumber": "ORD-123",
    "status": "confirmed"
  }
}
```

### به‌روزرسانی سفارش توسط طلافروش (Seller Update)
- **آدرس:** `POST /api/general/orders/:id/seller-update`
- **نیاز به توکن:** دارد
- **توضیحات:** API یکپارچه برای عملیات طلافروش (ثبت‌کننده سفارش). طلافروش می‌تواند سفارش خود را لغو کند یا نوع روش پرداخت را تغییر دهد.
  1. **لغو سفارش:** تنها قبل از مرحله دریافت توسط آزمایشگاه (`received`) امکان‌پذیر است.
  2. **تغییر نوع روش پرداخت (`wageType`):** پس از دریافت توسط آزمایشگاه (`received` یا `melted`) و قبل از تحویل/بایگانی امکان‌پذیر است. با تغییر نوع روش پرداخت، مقادیر عددی هزینه (`wageValue` و `totalPrice`) صفر می‌شوند تا آزمایشگاه مجدداً بر اساس روش پرداخت جدید هزینه‌ها را ثبت نماید.
- **ورودی برای لغو (JSON):**
```json
{
  "action": "cancel"
}
// یا
{
  "status": "cancelled"
}
```
- **خروجی لغو:**
```json
{
  "success": true,
  "message": "سفارش با موفقیت لغو شد",
  "data": {
    "_id": "6a6aa...",
    "orderNumber": "ORD-123",
    "status": "cancelled"
  }
}
```

- **ورودی برای تغییر نوع روش پرداخت (JSON):**
```json
{
  "wageType": "percent" // "gram" | "toman" | "percent"
}
```
- **خروجی تغییر نوع روش پرداخت:**
```json
{
  "success": true,
  "message": "نوع روش پرداخت با موفقیت تغییر یافت و مقادیر هزینه جهت ثبت مجدد توسط آزمایشگاه پاک شد",
  "data": {
    "_id": "6a6aa...",
    "orderNumber": "ORD-123",
    "wageType": "percent",
    "wageValue": 0,
    "totalPrice": 0,
    "status": "received"
  }
}
```

### دریافت زیرمجموعه‌های معرفی شده (Referrals)
- **آدرس:** `GET /api/auth/referrals`
- **نیاز به توکن:** دارد
- **توضیحات:** لیست کاربرانی (و شرکت‌های آن‌ها) که توسط کاربر فعلی معرفی شده‌اند را برمی‌گرداند. زیرشاخه‌های لایه دوم نیز در فیلد `subReferrals` بازگردانده می‌شوند.

### دریافت درخواست‌های ثبت همکار ارسال‌شده توسط کاربر (My Colleague Requests)
- **آدرس:** `GET /api/referrals/my-requests` یا `GET /api/referrals`
- **نیاز به توکن:** دارد
- **پارامترهای اختیاری GET:**
  - `status`: فیلتر بر اساس وضعیت (`pending` در انتظار تایید، `approved` تایید شده، `rejected` رد شده، یا `all` همه درخواست‌ها - پیش‌فرض `all` برای `my-requests`)
  - `page`: شماره صفحه (پیش‌فرض 1)
  - `limit`: تعداد در هر صفحه (پیش‌فرض 10)
- **توضیحات:** لیست تمام درخواست‌های معرفی همکار (طلافروش یا آزمایشگاه) که توسط کاربر جاری ثبت شده‌اند همراه با statusLabel فارسی ("در انتظار تایید"، "تایید شده"، "رد شده") و دلیل رد (در صورت وجود) را برمی‌گرداند.
- **نمونه خروجی:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "66a01234...",
      "targetMode": "gold",
      "targetMobile": "09121112233",
      "targetFname": "علی",
      "targetLname": "رضایی",
      "targetCompanyName": "طلافروشی البرز",
      "targetCompanyPhone": "02188888888",
      "targetCompanyAddress": "تهران، بازار طلا",
      "targetCity": "تهران",
      "status": "pending",
      "statusLabel": "در انتظار تایید",
      "rejectReason": "",
      "createdAt": "2026-08-03T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### دریافت آزمایشگاه‌های اخیر (Recent Labs)
- **آدرس:** `GET /api/general/labs/recent`
- **نیاز به توکن:** دارد
- **توضیحات:** حداکثر ۴ آزمایشگاهی که طلافروش اخیرا در آن‌ها نوبت گرفته و به مرحله بایگانی (`archived` یا `completed`) رسیده است را برمی‌گرداند.
