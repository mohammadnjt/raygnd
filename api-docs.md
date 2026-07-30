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
