const express = require("express");
const router = express.Router();
const generalController = require("../controllers/general.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/orders", authenticate, generalController.getOrders);
router.post("/orders/assign-ang", authenticate, generalController.assignAng);
router.post("/orders/deliver", authenticate, generalController.deliverOrder);

router.get("/labs", generalController.getLabs);
router.get("/notifications", authenticate, generalController.getNotifications);

router.post("/requests/project", authenticate, generalController.submitProject);
router.post("/requests/rental", authenticate, generalController.submitRental);

module.exports = router;
