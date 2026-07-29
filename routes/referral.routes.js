const express = require("express");
const router = express.Router();
const referralController = require("../controllers/referral.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.post("/create", authenticate, referralController.createReferral);
router.get("/", authenticate, referralController.getReferrals);
router.post("/approve", authenticate, requireAdmin, referralController.approveReferral);
router.post("/reject", authenticate, requireAdmin, referralController.rejectReferral);
router.get("/tree", authenticate, requireAdmin, referralController.getTree);

module.exports = router;
