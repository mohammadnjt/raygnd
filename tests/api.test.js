const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const redis = require("../scripts/redis");
const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rayg_test", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (e) {
      console.warn("Tests running without DB connection");
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("Gold Inquiry & Rayg API Test Suite", () => {
  let authToken = "";
  const testMobile = "09121112233";

  describe("1. System APIs", () => {
    it("GET /api/version - should return application version info without authentication", async () => {
      const res = await request(app).get("/api/version");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.version).toBeDefined();
    });
  });

  describe("2. Authentication APIs", () => {
    it("POST /api/auth/login - should request OTP code for user mobile", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ mobile: testMobile });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/auth/verify - should verify OTP code and return JWT token and user", async () => {
      const res = await request(app)
        .post("/api/auth/verify")
        .send({
          mobile: testMobile,
          code: "12345",
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it("POST /api/auth/verify - should return distinct users for different mobile numbers", async () => {
      const mobileA = "09350001111";
      const mobileB = "09350002222";

      await request(app).post("/api/auth/login").send({ mobile: mobileA });
      await request(app).post("/api/auth/login").send({ mobile: mobileB });

      const resA = await request(app)
        .post("/api/auth/verify")
        .send({ mobile: mobileA, code: "12345" });

      const resB = await request(app)
        .post("/api/auth/verify")
        .send({ mobile: mobileB, code: "12345" });

      expect(resA.body.user.mobile).toBe(mobileA);
      expect(resB.body.user.mobile).toBe(mobileB);
      expect(resA.body.token).toBeDefined();
      expect(resB.body.token).toBeDefined();
    });

    it("POST /api/auth/login - should enforce rate limit of 5 requests per 2 hours", async () => {
      const rateMobile = "09998887766";
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post("/api/auth/login").send({ mobile: rateMobile });
        expect(res.statusCode).toBe(200);
      }
      const limitRes = await request(app).post("/api/auth/login").send({ mobile: rateMobile });
      expect(limitRes.statusCode).toBe(429);
      expect(limitRes.body.success).toBe(false);
    });

    it("GET /api/auth/profile - should fail 401 when token is missing", async () => {
      const res = await request(app).get("/api/auth/profile");
      expect(res.statusCode).toBe(401);
    });

    it("GET /api/auth/profile - should get user profile with Bearer token", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("3. Gold Inquiry APIs", () => {
    it("GET /api/inquiry - should require angCode parameter (guest allowed)", async () => {
      const res = await request(app).get("/api/inquiry");
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/inquiry?angCode=123456 - should return gold assay result (guest allowed)", async () => {
      const res = await request(app).get("/api/inquiry?angCode=123456");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/inquiry/history - should return user inquiry history when authenticated", async () => {
      const res = await request(app)
        .get("/api/inquiry/history")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/inquiry/bookmarks/add - should add bookmark code when authenticated", async () => {
      const res = await request(app)
        .post("/api/inquiry/bookmarks/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ angCode: "998877" });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/inquiry/bookmarks - should return user bookmarks when authenticated", async () => {
      const res = await request(app)
        .get("/api/inquiry/bookmarks")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("POST /api/inquiry/bookmarks/remove - should remove bookmark when authenticated", async () => {
      const res = await request(app)
        .post("/api/inquiry/bookmarks/remove")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ angCode: "998877" });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("4. Laboratory & Orders Management APIs", () => {
    it("GET /api/general/orders - should return list of orders when authenticated", async () => {
      const res = await request(app).get("/api/general/orders").set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });
    
    it("GET /api/general/labs - should list registered assay labs when authenticated", async () => {
      const res = await request(app).get("/api/general/labs").set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/referrals/my-requests - should return user submitted partner registration requests", async () => {
      const res = await request(app)
        .get("/api/referrals/my-requests")
        .set("Authorization", `Bearer ${authToken}`);
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });

    it("POST /api/referrals/create - should create partner referral request and return companyId", async () => {
      const res = await request(app)
        .post("/api/referrals/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          targetMode: "gold",
          targetMobile: "09129990011",
          targetFname: "علی",
          targetLname: "احمدی",
          targetCompanyName: "طلافروشی پارس",
          targetCompanyPhone: "02144445555",
          targetCompanyAddress: "بازار بزرگ",
          targetCity: "تهران"
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.companyId).toBeDefined();
    });

    it("POST /api/general/orders/request - should create an order request with companyId and manual flag", async () => {
      const res = await request(app)
        .post("/api/general/orders/request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          companyId: "507f1f77bcf86cd799439011",
          selectedDate: "1405/07/15",
          selectedTime: "10:00-11:30",
          meltMethod: "traditional",
          assayMethod: "fireAssay",
          weight: 12.5,
          sellerName: "گالری جم",
          sellerPhone: "09121111111",
          manual: true
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.manual).toBe(true);
    });

    it("GET /api/general/goldsmiths - should return list of goldsmiths and support search", async () => {
      const res = await request(app)
        .get("/api/general/goldsmiths?search=0912")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/general/orders/verify-ang - should check ang uniqueness for a lab", async () => {
      const res = await request(app)
        .post("/api/general/orders/verify-ang")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ angCode: "Aa99999", labId: "507f1f77bcf86cd799439011" });
      expect([200, 503]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.isDuplicate).toBe(false);
      }
    });

    it("POST /api/general/orders/:id/seller-update - should return 404 or 503 for non-existent order / no DB", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post(`/api/general/orders/${fakeId}/seller-update`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ wageType: "toman" });
      expect([404, 503]).toContain(res.statusCode);
    });
  });

  describe("5. Super Admin User Management & Ticket System APIs", () => {
    let createdUserId = "";
    let createdTicketId = "";

    it("GET /api/admin/users - should return 403/401 forbidden for non-superAdmin user", async () => {
      const customerVerify = await request(app)
        .post("/api/auth/verify")
        .send({ mobile: "09990001122", code: "12345" });
      const customerToken = customerVerify.body.token;

      const res = await request(app)
        .get("/api/admin/users?page=1&limit=10")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.statusCode).toBe(401);
    });

    it("GET /api/admin/users - should return paginated users list for superAdmin user", async () => {
      const res = await request(app)
        .get("/api/admin/users?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/admin/top-searched-angs - should return top 10 searched ang codes for superAdmin", async () => {
      const res = await request(app)
        .get("/api/admin/top-searched-angs")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/admin/users/create - should create a new user", async () => {
      const newUserMobile = "09301112233";
      const res = await request(app)
        .post("/api/admin/users/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          mobile: newUserMobile,
          fname: "احمد",
          lname: "رضایی",
          role: "gold",
        });
      expect(res.statusCode).toBe(200);
      createdUserId = res.body.data._id || res.body.data.id;
    });

    it("POST /api/ticket/create - should create a new support ticket", async () => {
      const res = await request(app)
        .post("/api/ticket/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "مشکل در ثبت سفارش",
          message: "سلام، هنگام پرداخت ارور دریافت میکنم.",
        });
      expect(res.statusCode).toBe(200);
      createdTicketId = res.body.data._id || res.body.data.ticketNumber;
    });

    it("GET /api/ticket/list - should return tickets list", async () => {
      const res = await request(app)
        .get("/api/ticket/list?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it("POST /api/ticket/message - should add a message reply to ticket", async () => {
      const res = await request(app)
        .post("/api/ticket/message")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketId: createdTicketId,
          message: "پیگیری شد، مشکل مرتفع گردید.",
        });
      expect(res.statusCode).toBe(200);
    });

    it("POST /api/ticket/close - should close ticket", async () => {
      const res = await request(app)
        .post("/api/ticket/close")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ticketId: createdTicketId,
          status: "closed",
        });
      expect(res.statusCode).toBe(200);
    });
  });
});
