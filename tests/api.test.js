const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

describe("Gold Inquiry & Rayg API Test Suite", () => {
  let authToken = "";
  let userFinger = `test_finger_${Date.now()}`;
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
    it("GET /api?op=m_version - should return application version info", async () => {
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
        .send({ mobile: testMobile, finger: userFinger });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.code).toBe(12345);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.mobile).toBe(testMobile);
    });

    it("POST /api?op=m_verify - should verify OTP code and return JWT token and unique user", async () => {
      const res = await request(app)
        .post("/api?op=m_verify")
        .send({
          mobile: testMobile,
          code: "12345",
          finger: userFinger,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.mobile).toBe(testMobile);
      expect(res.body.finger).toBe(userFinger);

      if (res.body.token) {
        authToken = res.body.token;
      }
    });

    it("POST /api?op=m_verify - should return distinct users for different mobile numbers", async () => {
      const mobileA = "09350001111";
      const mobileB = "09350002222";

      const resA = await request(app)
        .post("/api?op=m_verify")
        .send({ mobile: mobileA, code: "12345", finger: "finger_A" });

      const resB = await request(app)
        .post("/api?op=m_verify")
        .send({ mobile: mobileB, code: "12345", finger: "finger_B" });

      expect(resA.body.user.mobile).toBe(mobileA);
      expect(resB.body.user.mobile).toBe(mobileB);
      expect(resA.body.finger).toBe("finger_A");
      expect(resB.body.finger).toBe("finger_B");
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

    it("POST /api?op=m_profile - should get/update user profile dynamically", async () => {
      const reqBuilder = request(app).post("/api?op=m_profile");
      if (authToken) {
        reqBuilder.set("Authorization", `Bearer ${authToken}`);
      }

      const res = await reqBuilder.send({
        mobile: testMobile,
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
    it("GET /api?op=m_inquiry - should require angCode parameter", async () => {
      const res = await request(app).get("/api?op=m_inquiry");
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("GET /api?op=m_inquiry&angCode=123456 - should return gold assay result", async () => {
      const res = await request(app)
        .get("/api?op=m_inquiry&angCode=123456")
        .set("x-user-finger", userFinger);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("GET /api?op=m_history - should return user inquiry history", async () => {
      const res = await request(app)
        .get("/api?op=m_history")
        .set("x-user-finger", userFinger);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_add_bookmark - should add bookmark code", async () => {
      const res = await request(app)
        .post("/api?op=m_add_bookmark")
        .set("x-user-finger", userFinger)
        .send({ code: "123456", note: "تست بوکمارک" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api?op=m_bookmarks - should return user bookmarks", async () => {
      const res = await request(app)
        .get("/api?op=m_bookmarks")
        .set("x-user-finger", userFinger);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_remove_bookmark - should remove bookmark", async () => {
      const res = await request(app)
        .post("/api?op=m_remove_bookmark")
        .set("x-user-finger", userFinger)
        .send({ code: "123456" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("4. Laboratory & Orders Management APIs", () => {
    it("GET /api?op=m_orders - should return list of orders", async () => {
      const res = await request(app)
        .get("/api?op=m_orders")
        .set("x-user-finger", userFinger);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api?op=m_assign_ang - should register ang code for order and sync report", async () => {
      const res = await request(app)
        .post("/api?op=m_assign_ang")
        .set("x-user-finger", userFinger)
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
        .set("x-user-finger", userFinger)
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

    it("GET /api?op=m_labs - should list registered assay labs", async () => {
      const res = await request(app).get("/api?op=m_labs");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET /api?op=m_notifications - should return notifications", async () => {
      const res = await request(app).get("/api?op=m_notifications");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("5. Requests & Submissions APIs", () => {
    it("POST /api?op=m_submit_project - should create project request", async () => {
      const res = await request(app)
        .post("/api?op=m_submit_project")
        .send({
          title: "پروژه ساخت قطعه طلا",
          description: "درخواست ری‌گیری و ساخت",
          phone: testMobile,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api?op=m_submit_rental - should create equipment rental request", async () => {
      const res = await request(app)
        .post("/api?op=m_submit_rental")
        .send({
          equipment: "دستگاه ری‌گیری XRF",
          duration: "3 days",
          phone: testMobile,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

