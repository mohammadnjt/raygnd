const mongoose = require("mongoose");
const Report = require("../models/report.model");
const redis = require("../scripts/redis");
const fetchFromMSanjesh = require("../scripts/msanjesh");

// Mock / Default Data fallback derived from dev.js specification
const DEFAULT_USERS = [
  {
    id: 1,
    mobile: "09123456789",
    fname: "محمد",
    lname: "رضایی",
    email: "mohammad.rezaei@example.com",
    avatar: "",
    nationalCode: "1234567890",
    role: "customer",
    city: "مشهد",
    address: "مشهد، خیابان امام رضا، پلاک ۱۲",
    phone: "09123456789",
    name: "محمد رضایی",
    createdAt: "1404/01/01",
    isActive: true,
  }
];

const DEFAULT_LABS = [
  { id: 1, name: "آزمایشگاه پوربرات", city: "مشهد", phone: "۰۵۸۳۲۲۲۹۹۳۲", address: "مشهد، خیابان طبرسی", score: 87, isActive: true },
  { id: 2, name: "آزمایشگاه صحرانورد", city: "مشهد", phone: "۰۵۸۳۲۲۲۶۷۲۳", address: "مشهد، خیابان امام خمینی", score: 76, isActive: true },
  { id: 3, name: "آزمایشگاه یزدانی", city: "تهران", phone: "۰۲۱۳۳۴۴۵۵۶۶", address: "تهران، خیابان ولیعصر", score: 72, isActive: true },
  { id: 4, name: "آزمایشگاه رضوی", city: "اصفهان", phone: "۰۳۱۳۲۲۲۱۱۲۲", address: "اصفهان، چهارباغ", score: 68, isActive: true },
  { id: 5, name: "آزمایشگاه نور", city: "شیراز", phone: "۰۷۱۳۲۲۲۳۳۴۴", address: "شیراز، خیابان زند", score: 65, isActive: true }
];

const DEFAULT_TOP_LABS = [
  { rank: "۱", name: "آزمایشگاه پوربرات", score: "۸۷", phone: "۰۵۸۳۲۲۲۹۹۳۲", city: "مشهد" },
  { rank: "۲", name: "آزمایشگاه صحرانورد", score: "۷۶", phone: "۰۵۸۳۲۲۲۶۷۲۳", city: "مشهد" },
  { rank: "۳", name: "آزمایشگاه یزدانی", score: "۷۲", phone: "۰۲۱۳۳۴۴۵۵۶۶", city: "تهران" },
  { rank: "۴", name: "آزمایشگاه رضوی", score: "۶۸", phone: "۰۳۱۳۲۲۲۱۱۲۲", city: "اصفهان" },
  { rank: "۵", name: "آزمایشگاه نور", score: "۶۵", phone: "۰۷۱۳۲۲۲۳۳۴۴", city: "شیراز" }
];

const DEFAULT_BANNERS = [
  { id: "1", title: "استعلام اصالت طلا", desc: "با وارد کردن کد انگ، اصالت طلا را بررسی کنید", color: "#DFEDFD" },
  { id: "2", title: "آزمایشگاه‌های معتبر", desc: "لیست آزمایشگاه‌های ری‌گیری معتبر کشور", color: "#FFF3DD" },
  { id: "3", title: "پیگیری نتایج", desc: "نتایج استعلام‌های قبلی خود را مشاهده کنید", color: "#E2F7EB" }
];

const DEFAULT_ORDERS = [
  {
    id: "ORD-1001",
    sellerId: "s1",
    sellerName: "گالری طلا و جواهر احسان",
    sellerPhone: "09123456787",
    labId: "l1",
    labName: "آزمایشگاه پوربرات",
    meltMethod: "traditional",
    source: "online",
    estimatedWeight: 150,
    bookingDateLabel: "امروز - ۱۰:۰۰",
    status: "pending",
    hasJewel: true,
    wage: null,
    labFeeAmount: 150000,
    labFeeType: "toman",
    sampleDelivered: true,
    createdAt: "1404/03/10"
  },
  {
    id: "ORD-0998",
    sellerId: "s1",
    sellerName: "گالری طلا و جواهر احسان",
    sellerPhone: "09123456787",
    labId: "l1",
    labName: "آزمایشگاه پوربرات",
    meltMethod: "traditional",
    source: "online",
    estimatedWeight: 90,
    bookingDateLabel: "دیروز - ۱۶:۰۰",
    status: "received",
    wage: { type: "gram", value: 2 },
    proformaNumber: "PF-2025",
    receivedWeight: 92,
    createdAt: "1404/03/08"
  }
];

// Unified Operation Dispatcher
exports.handleOperation = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const op = params.op || req.params.op;

    if (!op) {
      return res.status(400).json({ success: false, message: "Operation parameter (op) is required" });
    }

    switch (op) {
      // 1. Version
      case "m_version":
        return res.json({
          success: true,
          version: "1.0.0",
          logo: "https://raygnd.blhgroups.ir/assets/logo.png",
          name: "ری‌گیر"
        });

      // 2. Login
      case "m_login": {
        const mobile = params.username || params.mob || params.mobile || "09123456789";
        // Save OTP in Redis
        try {
          await redis.set(`otp:${mobile}`, "12345", "EX", 300);
        } catch (e) {}

        return res.json({
          success: true,
          message: "کد تایید برای شما ارسال شد",
          code: 12345,
          user: DEFAULT_USERS[0]
        });
      }

      // 3. Verify OTP
      case "m_verify": {
        const finger = params.finger || `finger_${Date.now()}`;
        return res.json({
          finger,
          success: true,
          message: "ورود موفقیت‌آمیز",
          user: DEFAULT_USERS[0]
        });
      }

      // 4. Profile
      case "m_profile": {
        if (params.fname || params.lname || params.name || params.email) {
          const updatedUser = {
            ...DEFAULT_USERS[0],
            fname: params.fname || DEFAULT_USERS[0].fname,
            lname: params.lname || DEFAULT_USERS[0].lname,
            email: params.email || DEFAULT_USERS[0].email,
            address: params.address || DEFAULT_USERS[0].address
          };
          return res.json({
            success: true,
            message: "پروفایل با موفقیت بروزرسانی شد",
            data: updatedUser
          });
        }
        return res.json({
          success: true,
          data: DEFAULT_USERS[0]
        });
      }

      // 5. Inquiry (Golden inquiry logic + msanjesh integration)
      case "m_inquiry": {
        const code = params.angCode || params.code;
        if (!code) {
          return res.status(400).json({ success: false, message: "کد انگ (angCode) الزامی است" });
        }

        const cacheKey = `report:${code}`;

        // a) Check Redis
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            console.log("[m_inquiry] Redis hit for code:", code);
            const parsed = JSON.parse(cached);
            return res.json({
              success: true,
              message: "استعلام با موفقیت انجام شد",
              data: parsed.data || parsed
            });
          }
        } catch (e) {}

        // b) Check MongoDB
        let dbRecord = null;
        if (mongoose.connection.readyState === 1) {
          try {
            dbRecord = await Report.findOne({ code });
          } catch (e) {}
        }

        if (dbRecord) {
          console.log("[m_inquiry] Mongo hit for code:", code);
          const formatted = dbRecord.htmlData && dbRecord.htmlData.length > 0
            ? dbRecord.htmlData.map((row, idx) => ({
                id: String(idx + 1),
                angCode: code,
                labName: row.center || "آزمایشگاه پوربرات",
                customer: row.customer || "گالری طلا و جواهر احسان",
                resultValue: row.result || "۷۵۰.۵",
                status: "تایید",
                date: new Date(dbRecord.createdAt).toLocaleDateString("fa-IR"),
                time: "۱۰:۳۰",
                details: {
                  receipt: row.receipt,
                  docText: dbRecord.docText
                }
              }))
            : [
                {
                  id: "1",
                  angCode: code,
                  labName: "آزمایشگاه ری‌گیری پوربرات",
                  customer: "گالری طلا و جواهر",
                  resultValue: "۷۵۰.۵",
                  status: "تایید",
                  date: new Date(dbRecord.createdAt).toLocaleDateString("fa-IR"),
                  time: "۱۰:۳۰",
                  details: { docText: dbRecord.docText }
                }
              ];

          try {
            await redis.set(cacheKey, JSON.stringify({ data: formatted }), "EX", 86400);
          } catch (e) {}

          return res.json({
            success: true,
            message: "استعلام با موفقیت انجام شد",
            data: formatted
          });
        }

        // c) Not in DB -> fetch from msanjesh.js!
        console.log("[m_inquiry] Fetching from msanjesh for code:", code);
        const msanjeshResult = await fetchFromMSanjesh(code);

        if (msanjeshResult.success && msanjeshResult.htmlData && msanjeshResult.htmlData.length > 0) {
          // Save to MongoDB
          let savedRecord = null;
          if (mongoose.connection.readyState === 1) {
            try {
              savedRecord = await Report.create({
                code,
                htmlData: msanjeshResult.htmlData,
                docText: msanjeshResult.docText
              });
            } catch (e) {}
          }

          const formatted = msanjeshResult.htmlData.map((row, idx) => ({
            id: String(idx + 1),
            angCode: code,
            labName: row.center || "آزمایشگاه ری‌گیری msanjesh",
            customer: row.customer || "مشتری",
            resultValue: row.result || "۷۵۰.۰",
            status: "تایید",
            date: new Date().toLocaleDateString("fa-IR"),
            time: "۱۰:۳۰",
            details: {
              receipt: row.receipt,
              docText: msanjeshResult.docText
            }
          }));

          try {
            await redis.set(cacheKey, JSON.stringify({ data: formatted }), "EX", 86400);
          } catch (e) {}

          return res.json({
            success: true,
            message: "استعلام با موفقیت انجام شد (از مرجع سنجش)",
            data: formatted
          });
        }

        // Fallback response for testing if msanjesh has no match
        const sampleFallback = [
          {
            id: "1",
            angCode: code,
            labName: "آزمایشگاه ری‌گیری پوربرات",
            customer: "گالری طلا و جواهر احسان",
            resultValue: "۷۵۰.۵",
            status: "تایید",
            date: "۱۴۰۵/۰۲/۱۵",
            time: "۱۰:۳۰",
            details: {
              weight: "۱۵۰ گرم",
              purity: "۷۵۰.۵",
              method: "ری‌گیری سنتی",
              labTechnician: "مهندس محمدی",
              certificateNo: `CERT-${code}`
            }
          }
        ];

        return res.json({
          success: true,
          message: "استعلام انجام شد",
          data: sampleFallback
        });
      }

      // 6. Inquiry History
      case "m_inquiry_history":
        return res.json({
          success: true,
          data: [
            { id: "inq-001", angCode: "Aa55576", labName: "آزمایشگاه پوربرات", resultValue: "۷۵۰.۵", status: "تایید", date: "۱۴۰۵/۰۲/۱۵", time: "۱۰:۳۰" },
            { id: "inq-002", angCode: "Bb12345", labName: "آزمایشگاه صحرانورد", resultValue: "۷۴۸.۲", status: "تایید", date: "۱۴۰۵/۰۲/۱۰", time: "۱۱:۰۰" }
          ]
        });

      // 7. Bookmark Inquiry
      case "m_bookmark_inquiry":
        return res.json({
          success: true,
          message: "استعلام با موفقیت نشان شد"
        });

      // 8. Bookmarks
      case "m_bookmarks":
        return res.json({
          success: true,
          data: [
            { id: "BM-001", angCode: "Aa55576", labName: "آزمایشگاه پوربرات", resultValue: "۷۵۰.۵", status: "تایید", date: "۱۴۰۵/۰۲/۱۵", savedAt: "۱۴۰۵/۰۲/۱۵" }
          ]
        });

      // 9. Labs
      case "m_labs":
        return res.json({ success: true, data: DEFAULT_LABS });

      // 10. Top Labs
      case "m_top_labs":
        return res.json({ success: true, data: DEFAULT_TOP_LABS });

      // 11. Home Banners
      case "m_home_banners":
        return res.json({ success: true, data: DEFAULT_BANNERS });

      // 12. Orders (Lab view)
      case "m_orders":
        return res.json({ success: true, data: DEFAULT_ORDERS });

      // 13. Seller Orders
      case "m_seller_orders":
        return res.json({ success: true, data: DEFAULT_ORDERS });

      // 14. Add Order
      case "m_add_order":
        return res.json({
          success: true,
          message: "سفارش با موفقیت ثبت شد",
          data: {
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            status: "pending",
            createdAt: "۱۴۰۴/۰۳/۱۰"
          }
        });

      // 15. Confirm Order
      case "m_confirm_order":
        return res.json({
          success: true,
          message: "سفارش با موفقیت تایید شد",
          data: { id: params.orderId || "ORD-1001", status: "confirmed" }
        });

      // 16. Receive Order
      case "m_receive_order":
        return res.json({
          success: true,
          message: "طلا با موفقیت دریافت شد",
          data: { id: params.orderId || "ORD-1001", status: "received", receivedWeight: params.receivedWeight || 150 }
        });

      // 17. Melt Order
      case "m_melt_order":
        return res.json({
          success: true,
          message: "ذوب با موفقیت ثبت شد",
          data: { id: params.orderId || "ORD-1001", status: "melted" }
        });

      // 18. Deliver Order
      case "m_deliver_order":
        return res.json({
          success: true,
          message: "طلا با موفقیت تحویل داده شد",
          data: { id: params.orderId || "ORD-1001", status: "delivered" }
        });

      // 19. Archive Order
      case "m_archive_order":
        return res.json({ success: true, message: "سفارش با موفقیت بایگانی شد" });

      // 20. Cancel Order
      case "m_cancel_order":
        return res.json({ success: true, message: "سفارش با موفقیت لغو شد" });

      // 21. Assign Ang Code
      case "m_assign_ang":
        return res.json({
          success: true,
          message: "کد انگ با موفقیت ثبت شد",
          data: { id: params.orderId || "ORD-1001", stampCode: params.stampCode || "Ab115001" }
        });

      // 22. Resolve Trust
      case "m_resolve_trust":
        return res.json({
          success: true,
          message: "عیار امانت با موفقیت تعیین شد",
          data: { id: params.orderId || "ORD-0960", purity: params.purity || 750 }
        });

      // 23. Rental Requests
      case "m_rental_requests":
        return res.json({
          success: true,
          data: [
            {
              id: "RENT-001",
              type: "rental",
              status: "در حال بررسی",
              workshopName: "کارگاه صنعتی امید",
              date: "۱۴۰۴/۰۲/۱۵",
              createdAt: "1404/02/10"
            }
          ]
        });

      // 24. Submit Rental
      case "m_submit_rental":
        return res.json({
          success: true,
          message: "درخواست کرایه با موفقیت ثبت شد",
          data: { id: `RENT-${Date.now().toString().slice(-3)}`, status: "در حال بررسی" }
        });

      // 25. Remove Form
      case "m_remove_form":
        return res.json({ success: true, message: "فرم با موفقیت حذف شد" });

      // 26. Project Requests
      case "m_project_requests":
        return res.json({
          success: true,
          data: [
            {
              id: "PROJ-001",
              type: "project",
              status: "pending",
              workshopName: "شرکت ساختمانی آریا",
              category: "ساختمانی",
              createdAt: "1404/02/05"
            }
          ]
        });

      // 27. Submit Project
      case "m_submit_project":
        return res.json({
          success: true,
          message: "درخواست پروژه‌ای با موفقیت ثبت شد",
          data: { id: `PROJ-${Date.now().toString().slice(-3)}`, status: "pending" }
        });

      // 28. Hesab / Financials
      case "m_hesab":
        return res.json({
          success: true,
          message: "گردش حساب بارگذاری شد.",
          list: [
            { date: "1404/01/01", description: "اولیه", bes: "0", bed: "0", mnds: "0", mndv: "بی حساب" },
            { date: "1404/01/15", description: "فروش ری‌گیری - ORD-1001", bes: "۵۰۰,۰۰۰", bed: "0", mnds: "۵۰۰,۰۰۰", mndv: "بدهکار" }
          ],
          kols: "۱,۰۷۰,۰۰۰",
          kolv: "بدهکار",
          kolr: "۱,۰۷۰,۰۰۰"
        });

      // 29. Referral
      case "m_submit_referral":
        return res.json({
          success: true,
          message: "درخواست عضویت همکار با موفقیت ثبت شد و در انتظار تایید مدیریت است."
        });

      // 30. Support Ticket
      case "m_support_ticket":
        return res.json({
          success: true,
          message: "تیکت پشتیبانی با موفقیت ثبت شد",
          data: { id: "TKT-001", status: "open" }
        });

      // 31. Notifications
      case "m_notifications":
        return res.json({
          success: true,
          data: [
            { id: "NOTIF-001", title: "ثبت سفارش جدید", message: "سفارش جدید از گالری طلا و جواهر احسان ثبت شد", type: "order", isRead: false, createdAt: "۱۴۰۴/۰۳/۱۰ - ۱۰:۰۰" }
          ]
        });

      // 32. Mark Notification Read
      case "m_mark_notification_read":
        return res.json({ success: true, message: "اعلان با موفقیت به‌روزرسانی شد" });

      // 33. Lab Dashboard
      case "m_dashboard":
        return res.json({
          success: true,
          data: {
            todayOrders: 3,
            pendingOrders: 1,
            receivedOrders: 2,
            meltedOrders: 1,
            deliveredOrders: 0,
            archivedOrders: 2,
            cancelledOrders: 1,
            totalOrders: 7,
            totalRevenue: "۱,۰۷۰,۰۰۰"
          }
        });

      // 34. Admin Dashboard
      case "m_admin_dashboard":
        return res.json({
          success: true,
          data: {
            totalUsers: 4,
            totalLabs: 5,
            totalSellers: 3,
            totalOrders: 7,
            totalInquiries: 5
          }
        });

      // 35. Workshops
      case "m_workshops":
        return res.json({
          success: true,
          data: [
            { id: 1, name: "کارگاه صنعتی امید", city: "مشهد", phone: "۰۵۱۳۲۲۲۱۱۲۲", type: "industrial" },
            { id: 2, name: "کارگاه ساختمانی پارس", city: "تهران", phone: "۰۲۱۳۳۴۴۵۵۷۷", type: "construction" }
          ]
        });

      // 36. File Upload
      case "m_upload": {
        const file = req.file;
        const fileName = file ? file.filename : `uploaded_${Date.now()}.jpg`;
        return res.json({
          success: true,
          message: "آپلود فایل با موفقیت انجام شد.",
          file: fileName,
          fileUrl: `https://raygnd.blhgroups.ir/uploads/${fileName}`
        });
      }

      default:
        return res.json({
          success: true,
          op,
          message: `عملیات ${op} با موفقیت دریافت شد`
        });
    }
  } catch (err) {
    console.error("[API Error]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
