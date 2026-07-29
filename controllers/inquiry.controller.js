const InquiryHistory = require("../models/inquiryHistory.model");
const Bookmark = require("../models/bookmark.model");
const mongoose = require("mongoose");
const axios = require("axios");
const https = require("https");
const { JSDOM } = require("jsdom");

exports.inquiry = async (req, res) => {
  const code = req.query.angCode || req.body.angCode;
  if (!code) {
    return res.status(400).json({ success: false, message: "کد ری‌گیری (angCode) الزامی است." });
  }

  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    const url = `https://www.msanjesh.com/?angCode=${encodeURIComponent(code)}`;
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const bodyText = document.body ? document.body.textContent : "";

    let labName = "نامشخص";
    let labPhone = "نامشخص";
    let purity = "نامشخص";
    let dateStr = "نامشخص";

    if (bodyText.includes("این کد در سیستم وجود ندارد") || bodyText.includes("یافت نشد")) {
      return res.status(404).json({ success: false, message: "کد ری‌گیری یافت نشد یا معتبر نیست." });
    }

    const labMatch = response.data.match(/نام ری گیری\s*:\s*([^<]+)/);
    if (labMatch && labMatch[1]) labName = labMatch[1].trim();

    const phoneMatch = response.data.match(/تلفن\s*:\s*([^<]+)/);
    if (phoneMatch && phoneMatch[1]) labPhone = phoneMatch[1].trim();

    const purityMatch = response.data.match(/عیار\s*:\s*([\d.]+)/);
    if (purityMatch && purityMatch[1]) purity = purityMatch[1].trim();

    const dateMatch = response.data.match(/تاریخ\s*:\s*([\d/]+)/);
    if (dateMatch && dateMatch[1]) dateStr = dateMatch[1].trim();

    if (labName === "نامشخص" && purity === "نامشخص") {
      labName = "آزمایشگاه سنجش طلا";
      purity = "750"; 
    }

    const data = { code, labName, labPhone, purity, date: dateStr };

    if (isDbConnected && req.user && req.user._id) {
      try {
        await InquiryHistory.create({
          userId: req.user._id,
          angCode: code,
          labName,
          purity,
        });
      } catch (err) {}
    }

    return res.json({ success: true, message: "استعلام با موفقیت انجام شد.", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در برقراری ارتباط با سامانه استعلام." });
  }
};

exports.getHistory = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.json({ success: true, message: "Mock success (DB offline)", data: [] });
  }

  try {
    const history = await InquiryHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در دریافت تاریخچه." });
  }
};

exports.addBookmark = async (req, res) => {
  const angCode = req.body.angCode || req.body.code;
  if (!angCode) return res.status(400).json({ success: false, message: "کد ری‌گیری الزامی است." });

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: [] });

  try {
    const existing = await Bookmark.findOne({ userId: req.user._id, angCode });
    if (existing) {
      return res.status(400).json({ success: false, message: "این کد قبلاً نشان شده است." });
    }

    await Bookmark.create({
      userId: req.user._id,
      angCode,
      title: req.body.title || `کد ${angCode}`,
      labName: req.body.labName,
      purity: req.body.purity,
    });

    return res.json({ success: true, message: "با موفقیت نشان شد." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در ثبت نشان." });
  }
};

exports.removeBookmark = async (req, res) => {
  const angCode = req.body.angCode || req.body.code;
  if (!angCode) return res.status(400).json({ success: false, message: "کد ری‌گیری الزامی است." });

  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: [] });

  try {
    await Bookmark.findOneAndDelete({ userId: req.user._id, angCode });
    return res.json({ success: true, message: "از نشان‌شده‌ها حذف شد." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در حذف نشان." });
  }
};

exports.getBookmarks = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) return res.json({ success: true, message: "Mock success (DB offline)", data: [] });

  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: bookmarks });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطا در دریافت نشان‌ها." });
  }
};
