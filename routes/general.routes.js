const express = require("express");
const router = express.Router();
const generalController = require("../controllers/general.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/orders", authenticate, generalController.getOrders);
router.post("/orders/assign-ang", authenticate, generalController.assignAng);
router.post("/orders/deliver", authenticate, generalController.deliverOrder);
router.post("/orders/:id/update", authenticate, generalController.updateOrder);

router.get("/labs", generalController.getLabs);
router.get("/labs/recent", authenticate, generalController.getRecentLabs);
router.get("/labs/:id/settings", authenticate, generalController.getLabSettings);
router.post("/orders/request", authenticate, generalController.requestOrder);
router.get("/dashboard", generalController.getDashboard);
router.get("/notifications", authenticate, generalController.getNotifications);

router.post("/requests/project", authenticate, generalController.submitProject);
router.post("/requests/rental", authenticate, generalController.submitRental);

router.post("/rate-company", authenticate, generalController.rateCompany);
module.exports = router;
