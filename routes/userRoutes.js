// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController"); // Import user controller

// Define user API routes
router.post("/", userController.createUser); // POST /users
router.get("/:id", userController.getUserById); // GET /users/:id
router.get("/", userController.getAllUsers); // GET /users

router.get("/:id/sent-messages", userController.getSentMessages); // GET /users/:id/sent-messages

router.get("/:id/inbox-messages", userController.getInboxMessages); // GET /users/:id/inbox-messages

module.exports = router;
