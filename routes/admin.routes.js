const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.get("/users", authenticate, requireAdmin, adminController.getUsers);
router.post("/users/create", authenticate, requireAdmin, adminController.createUser);
router.post("/users/update", authenticate, requireAdmin, adminController.updateUser);
router.post("/users/delete", authenticate, requireAdmin, adminController.deleteUser);
router.get("/top-searched-angs", authenticate, requireAdmin, adminController.getTopSearchedAngs);
router.get("/top-searched", authenticate, requireAdmin, adminController.getTopSearchedAngs);

module.exports = router;
