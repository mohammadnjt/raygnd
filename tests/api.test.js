const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

describe("Gold Inquiry & Rayg API Test Suite", () => {
  let authToken = "";
  const testMobile = "09121112233";

  beforeAll(async () => {
    // Ensure DB connection if needed or allow offline mode
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("1. System APIs", () => {
    it("GET /api?op=m_version - should return application version info without authentication", async () => {
      const res = await request(app).get("/api?op=m_version");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.version).toBe("1.0.0");
      expect(res.body.name).toBe("ری‌گیر");
    });
  });

  describe("2. Authentication APIs (m_login, m_verify, m_profile)", () => {
    it("POST /api?op=m_login - should request OTP code for user mobile", async () => {
      const res = await request(app)
        .post("/api?op=m_login")
        .send({ mobile: testMobile });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.code).toBe(12345);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.mobile).toBe(testMobile);
    });

    it("POST /api?op=m_verify - should verify OTP code and return JWT token and user", async () => {
      const res = await request(app)
        .post("/api?op=m_verify")
        .send({
          mobile: testMobile,
          code: "12345",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.mobile).toBe(testMobile);
      expect(res.body.token).toBeDefined();

      authToken = res.body.token;
    });

    it("POST /api?op=m_verify - should return distinct users for different mobile numbers", async () => {
      const mobileA = "09350001111";
      const mobileB = "09350002222";

      const resA = await request(app)
        .post("/api?op=m_verify")
        .send({ mobile: mobileA, code: "12345" });

      const resB = await request(app)
        .post("/api?op=m_verify")
        .send({ mobile: mobileB, code: "12345" });

      expect(resA.body.user.mobile).toBe(mobileA);
      expect(resB.body.user.mobile).toBe(mobileB);
      expect(resA.body.token).toBeDefined();
      expect(resB.body.token).toBeDefined();
    });

    it("POST /api?op=m_login - should enforce rate limit of 5 requests per 2 hours", async () => {
      const rateMobile = "09998887766";
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api?op=m_login")
          .send({ mobile: rateMobile });
        expect(res.statusCode).toBe(200);
      }

      // 6th call should be blocked with 429
      const blockedRes = await request(app)
        .post("/api?op=m_login")
        .send({ mobile: rateMobile });

      expect(blockedRes.statusCode).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.message).toContain("بیش از ۵ بار");
    });

    it("POST /api?op=m_profile - should fail 401 when token is missing", async () => {
      const res = await request(app).post("/api?op=m_profile").send({});
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("POST /api?op=m_profile - should get/update user profile with Bearer token", async () => {
      const res = await request(app)
        .post("/api?op=m_profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fname: "علی",
          lname: "احمدی",
          city: "تهران",
          email: "ali.ahmadi@example.com",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe("3. Gold Inquiry APIs (m_inquiry, m_history, m_bookmarks)", () => {
    it("GET /api?op=m_inquiry - should require angCode parameter (guest allowed)", async () => {
      const res = await request(app).get("/api?op=m_inquiry");
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("GET /api?op=m_inquiry&angCode=123456 - should return gold assay result (guest allowed)", async () => {
      const res = await request(app)
        .get("/api?op=m_inquiry&angCode=123456");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("GET /api?op=m_history - should return user inquiry history when authenticated", async () => {
      const res = await request(app)
        .get("/api?op=m_history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_add_bookmark - should add bookmark code when authenticated", async () => {
      const res = await request(app)
        .post("/api?op=m_add_bookmark")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "123456", note: "تست بوکمارک" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api?op=m_bookmarks - should return user bookmarks when authenticated", async () => {
      const res = await request(app)
        .get("/api?op=m_bookmarks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_remove_bookmark - should remove bookmark when authenticated", async () => {
      const res = await request(app)
        .post("/api?op=m_remove_bookmark")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "123456" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("4. Laboratory & Orders Management APIs", () => {
    it("GET /api?op=m_orders - should return list of orders when authenticated", async () => {
      const res = await request(app)
        .get("/api?op=m_orders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_assign_ang - should register ang code for order and sync report", async () => {
      const res = await request(app)
        .post("/api?op=m_assign_ang")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: "ORD-TEST-101",
          stampCode: "Ab998877",
          purity: "750",
          labName: "آزمایشگاه تست مرکزی",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stampCode).toBe("Ab998877");
    });

    it("POST /api?op=m_deliver_order - should deliver order with stampCode", async () => {
      const res = await request(app)
        .post("/api?op=m_deliver_order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: "ORD-TEST-101",
          stampCode: "Ab998877",
          deliveredWeight: 120,
          purity: 750,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("delivered");
    });

    it("GET /api?op=m_labs - should list registered assay labs when authenticated", async () => {
      const res = await request(app)
        .get("/api?op=m_labs")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET /api?op=m_notifications - should return notifications when authenticated", async () => {
      const res = await request(app)
        .get("/api?op=m_notifications")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("5. Requests & Submissions APIs", () => {
    it("POST /api?op=m_submit_project - should create project request when authenticated", async () => {
      const res = await request(app)
        .post("/api?op=m_submit_project")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "پروژه ساخت قطعه طلا",
          description: "درخواست ری‌گیری و ساخت",
          phone: testMobile,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api?op=m_submit_rental - should create equipment rental request when authenticated", async () => {
      const res = await request(app)
        .post("/api?op=m_submit_rental")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          equipment: "دستگاه ری‌گیری XRF",
          duration: "3 days",
          phone: testMobile,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("6. Super Admin User Management & Ticket System APIs", () => {
    let createdUserId = "";
    let createdTicketId = "";

    it("GET /api?op=m_admin_users - should return 403 forbidden for non-superAdmin user", async () => {
      // Get token for non-superAdmin user
      const customerVerify = await request(app)
        .post("/api?op=m_verify")
        .send({ mobile: "09990001122", code: "12345" });
      const customerToken = customerVerify.body.token;

      const res = await request(app)
        .get("/api?op=m_admin_users&page=1&limit=10")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api?op=m_admin_users - should return paginated users list for superAdmin user", async () => {
      const res = await request(app)
        .get("/api?op=m_admin_users&page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it("POST /api?op=m_admin_create_user - should create a new user with role and company name", async () => {
      const newUserMobile = "09301112233";
      const res = await request(app)
        .post("/api?op=m_admin_create_user")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          mobile: newUserMobile,
          fname: "احمد",
          lname: "رضایی",
          role: "gold",
          companyName: "طلافروشی رضایی",
          city: "تهران",
          address: "بازار بزرگ",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.mobile).toBe(newUserMobile);
      expect(res.body.data.companyName).toBe("طلافروشی رضایی");
      expect(res.body.data.name).toBe("احمد رضایی");

      createdUserId = res.body.data._id || res.body.data.id;
    });

    it("POST /api?op=m_admin_update_user - should update existing user details", async () => {
      const res = await request(app)
        .post("/api?op=m_admin_update_user")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          id: createdUserId,
          city: "اصفهان",
          fname: "احمد رضا",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe("اصفهان");
      expect(res.body.data.fname).toBe("احمد رضا");
    });

    it("POST /api?op=m_admin_delete_user - should delete user", async () => {
      const res = await request(app)
        .post("/api?op=m_admin_delete_user")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          id: createdUserId,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api?op=m_create_ticket - should create a new support ticket", async () => {
      const res = await request(app)
        .post("/api?op=m_create_ticket")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "مشکل در ثبت سفارش",
          department: "پشتیبانی فنی",
          priority: "high",
          message: "سلام، هنگام پرداخت ارور دریافت میکنم.",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.ticketNumber).toBeDefined();

      createdTicketId = res.body.data._id || res.body.data.ticketNumber;
    });

    it("GET /api?op=m_tickets - should return tickets list with pagination", async () => {
      const res = await request(app)
        .get("/api?op=m_tickets&page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_send_ticket_message - should add a message reply to ticket", async () => {
      const res = await request(app)
        .post("/api?op=m_send_ticket_message")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketId: createdTicketId,
          message: "پیگیری شد، مشکل مرتفع گردید.",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api?op=m_close_ticket - should close ticket", async () => {
      const res = await request(app)
        .post("/api?op=m_close_ticket")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketId: createdTicketId,
          status: "closed",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("closed");
    });
  });
});

