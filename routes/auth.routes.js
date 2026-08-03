const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/login", authController.login);
router.post("/verify", authController.verify);
router.get("/profile", authenticate, authController.getProfile);
router.get("/referrals", authenticate, authController.getReferrals);
router.post("/profile", authenticate, authController.updateProfile);

router.post("/company/settings", authenticate, authController.updateCompanySettings);
module.exports = router;
