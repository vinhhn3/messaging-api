// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController"); // Import message controller

// Message API routes
router.post("/", messageController.sendMessage); // POST /messages - Send a message
router.get("/:id", messageController.getMessageWithRecipients);
router.patch("/:id/mark-read", messageController.markMessageAsRead);
module.exports = router;
