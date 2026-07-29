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
- **پارامتر ارسالی:** `file` (فایل تصویری)
