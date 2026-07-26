// const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const Report = require("../models/report.model");
// const crypto = require('crypto');
// const sms = require('../services/sms.service');
const blhLog = require('../middleware/logger.middleware');

const redis = require("../scripts/redis");
const fetchFromMSanjesh = require("../scripts/msanjesh");

exports.report = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code)
      return res.status(400).json({
        success: false,
        message: "code query param is required"
      });

    // 1) Check Redis Cache
    const cacheKey = `report:${code}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log("CACHE HIT");
        return res.json({
          success: true,
          from: "redis",
          data: JSON.parse(cached)
        });
      }
    } catch (redisErr) {
      console.warn("Redis get error:", redisErr.message);
    }

    // 2) Check MongoDB
    let dbRecord = null;
    if (mongoose.connection.readyState === 1) {
      try {
        dbRecord = await Report.findOne({ code });
      } catch (dbErr) {
        console.warn("MongoDB query failed:", dbErr.message);
      }
    }

    if (dbRecord) {
      console.log("MONGO HIT");

      // save to redis for next time
      try {
        await redis.set(cacheKey, JSON.stringify(dbRecord), "EX", 60 * 60 * 24); // 24 hour
      } catch (e) {}

      return res.json({
        success: true,
        from: "mongo",
        data: dbRecord
      });
    }

    // 3) Fetch from msanjesh
    console.log("FETCHING FROM MSANJESH...");

    const fetched = await fetchFromMSanjesh(code);

    if (!fetched.success) {
      return res.status(500).json({
        success: false,
        message: "Error fetching from msanjesh",
        error: fetched.error
      });
    }

    // 4) Save to MongoDB
    let saved = {
      code,
      htmlData: fetched.htmlData,
      docText: fetched.docText
    };

    if (mongoose.connection.readyState === 1) {
      try {
        saved = await Report.create({
          code,
          htmlData: fetched.htmlData,
          docText: fetched.docText
        });
      } catch (dbErr) {
        console.warn("Failed to save report to Mongo:", dbErr.message);
      }
    }

    // 5) Save to Redis
    try {
      await redis.set(cacheKey, JSON.stringify(saved), "EX", 60 * 60 * 24);
    } catch (e) {}

    return res.json({
      success: true,
      from: "msanjesh",
      data: saved
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "internal server error",
      error: error.message
    });
  }
};
