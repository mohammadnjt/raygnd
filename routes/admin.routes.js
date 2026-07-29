const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.get("/users", authenticate, requireAdmin, adminController.getUsers);
router.post("/users/create", authenticate, requireAdmin, adminController.createUser);
router.post("/users/update", authenticate, requireAdmin, adminController.updateUser);
router.post("/users/delete", authenticate, requireAdmin, adminController.deleteUser);

module.exports = router;
