const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

let authToken = "";

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rayg_test", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (e) {}
  }
  
  // mock user auth
  const res = await request(app)
    .post("/api/auth/verify")
    .send({ mobile: "09121112233", code: "12345" });
  if (!res.body.token) {
    await request(app).post("/api/auth/login").send({ mobile: "09121112233" });
    const verifyRes = await request(app).post("/api/auth/verify").send({ mobile: "09121112233", code: "12345" });
    authToken = verifyRes.body.token;
  } else {
    authToken = res.body.token;
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

describe("Upload API Test", () => {
  it("POST /api/upload - should upload a file", async () => {
    const testFilePath = path.join(__dirname, "test-image.png");
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, "mock image content");
    }

    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", testFilePath, "test-image.png");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.path).toBeDefined();
    expect(res.body.data.url).toBeDefined();

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});
