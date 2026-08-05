const express = require("express");
const router = express.Router();
const generalController = require("../controllers/general.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/orders", authenticate, generalController.getOrders);
router.get("/orders/verify-ang", authenticate, generalController.verifyAng);
router.post("/orders/verify-ang", authenticate, generalController.verifyAng);
router.get("/verify-ang", authenticate, generalController.verifyAng);
router.post("/verify-ang", authenticate, generalController.verifyAng);
router.post("/orders/assign-ang", authenticate, generalController.assignAng);
router.post("/orders/deliver", authenticate, generalController.deliverOrder);
router.post("/orders/:id/update", authenticate, generalController.updateOrder);
router.post("/orders/:id/cancel", authenticate, generalController.cancelOrder);
router.post("/orders/:id/payment-method", authenticate, generalController.updatePaymentMethod);
router.post("/orders/:id/seller-update", authenticate, generalController.sellerUpdateOrder);

router.get("/goldsmiths", authenticate, generalController.getGoldsmiths);
router.get("/sellers", authenticate, generalController.getGoldsmiths);
router.get("/labs/goldsmiths", authenticate, generalController.getGoldsmiths);

router.get("/labs", generalController.getLabs);
router.get("/labs/recent", authenticate, generalController.getRecentLabs);
router.get("/labs/:id/settings", authenticate, generalController.getLabSettings);
router.post("/orders/request", authenticate, generalController.requestOrder);
router.post("/orders/create", authenticate, generalController.requestOrder);
router.post("/orders", authenticate, generalController.requestOrder);
router.get("/dashboard", generalController.getDashboard);
router.get("/notifications", authenticate, generalController.getNotifications);

router.post("/requests/project", authenticate, generalController.submitProject);
router.post("/requests/rental", authenticate, generalController.submitRental);

router.post("/rate-company", authenticate, generalController.rateCompany);
module.exports = router;
