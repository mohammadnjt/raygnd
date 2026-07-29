const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/", authenticate, uploadController.uploadMiddleware, uploadController.uploadFile);

module.exports = router;
