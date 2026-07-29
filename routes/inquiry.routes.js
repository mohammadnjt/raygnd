const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiry.controller");
const { authenticate } = require("../middleware/auth.middleware");

const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    authenticate(req, res, next);
  } else {
    next();
  }
};

router.get("/", optionalAuth, inquiryController.inquiry);
router.post("/", optionalAuth, inquiryController.inquiry);

router.get("/history", authenticate, inquiryController.getHistory);
router.post("/bookmarks/add", authenticate, inquiryController.addBookmark);
router.post("/bookmarks/remove", authenticate, inquiryController.removeBookmark);
router.get("/bookmarks", authenticate, inquiryController.getBookmarks);

module.exports = router;
