const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/create", authenticate, ticketController.createTicket);
router.get("/list", authenticate, ticketController.getTickets);
router.get("/detail", authenticate, ticketController.getTicket);
router.post("/message", authenticate, ticketController.sendMessage);
router.post("/close", authenticate, ticketController.closeTicket);

module.exports = router;
