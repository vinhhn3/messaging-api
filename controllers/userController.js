// controllers/userController.js
const db = require("../models"); // Import the database connection and models
const { User } = db; // Destructure the User model

/**
 * @desc Create a new user
 * @route POST /users
 * @access Public
 */
exports.createUser = async (req, res) => {
  try {
    const { email, name } = req.body;

    // Basic input validation
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required." });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }

    // Create the user
    const user = await User.create({ email, name });

    // Respond with the created user (excluding sensitive info if any, though none here)
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ error: "Internal server error during user creation." });
  }
};

/**
 * @desc Retrieve user information by ID
 * @route GET /users/:id
 * @access Public
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user by primary key (ID)
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Respond with user information
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error retrieving user by ID:", error);
    res
      .status(500)
      .json({ error: "Internal server error during user retrieval." });
  }
};

/**
 * @desc List all users
 * @route GET /users
 * @access Public
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Find all users
    const users = await User.findAll({
      attributes: ["id", "email", "name", "createdAt"], // Select specific attributes
    });

    // Respond with the list of users
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error listing all users:", error);
    res
      .status(500)
      .json({ error: "Internal server error during user listing." });
  }
};

/**
 * @desc View sent messages for a specific user
 * @route GET /users/:id/sent-messages
 * @access Public
 * @param {string} id - User ID (sender ID)
 */
exports.getSentMessages = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is the sender's user ID

    // Check if the user exists
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find all messages where the senderId matches the provided user ID
    // Include the sender's details and all recipients for each message
    const sentMessages = await Message.findAll({
      where: { senderId: id },
      include: [
        {
          model: User,
          as: "sender", // Alias defined in models/index.js for sender association
          attributes: ["id", "name", "email"], // Select specific attributes for sender
        },
        {
          model: MessageRecipient,
          as: "recipients", // Alias defined in models/index.js for recipients association
          attributes: ["recipientId", "read", "readAt"], // Select specific attributes for recipient status
          include: {
            model: User,
            as: "recipient", // Alias for the actual recipient user
            attributes: ["id", "name", "email"], // Select specific attributes for recipient user
          },
        },
      ],
      order: [["timestamp", "DESC"]], // Order messages by most recent first
    });

    res.status(200).json({ sentMessages });
  } catch (error) {
    console.error(
      `Error retrieving sent messages for user ${req.params.id}:`,
      error
    ); // More specific error logging
    res
      .status(500)
      .json({ error: "Internal server error during sent messages retrieval." });
  }
};

/**
 * @desc View inbox messages for a specific user
 * @route GET /users/:id/inbox-messages
 * @access Public
 * @param {string} id - User ID (recipient ID)
 * @query {boolean} [read] - Optional query parameter to filter unread messages (e.g., ?read=false)
 */
exports.getInboxMessages = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is the recipient's user ID
    const { read } = req.query; // 'read' will be a string 'true' or 'false' or undefined

    // Check if the user exists
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const whereClause = { recipientId: id };
    if (read !== undefined) {
      // Convert 'true'/'false' string to boolean.
      // If `read` is 'false', it means we want unread messages.
      // If `read` is 'true', it means we want read messages.
      whereClause.read = read === "true";
    }

    // Find all MessageRecipient entries for the given recipient ID
    // Include the associated Message and its sender details
    const inboxMessages = await MessageRecipient.findAll({
      where: whereClause,
      include: [
        {
          model: Message,
          as: "message", // Alias defined in models/index.js for message association
          attributes: ["id", "subject", "content", "timestamp"], // Select specific attributes for the message
          include: {
            model: User,
            as: "sender", // Alias for the sender of the message
            attributes: ["id", "name", "email"], // Select specific attributes for sender user
          },
        },
        {
          model: User,
          as: "recipient", // Alias for the recipient user (which is 'id' from params)
          attributes: ["id", "name", "email"], // Select specific attributes for recipient user
        },
      ],
      // Order by unread messages first, then by readAt (descending for read), then message timestamp (descending)
      order: [
        ["read", "ASC"],
        ["readAt", "DESC"],
        [Message, "timestamp", "DESC"],
      ],
    });

    // Format the output to be more message-centric and user-friendly
    const formattedInbox = inboxMessages.map((mr) => ({
      messageId: mr.message.id,
      subject: mr.message.subject,
      content: mr.message.content,
      timestamp: mr.message.timestamp,
      sender: {
        id: mr.message.sender.id,
        name: mr.message.sender.name,
        email: mr.message.sender.email,
      },
      readStatus: {
        isRead: mr.read,
        readAt: mr.readAt,
        messageRecipientId: mr.id, // Include this for easy marking as read later
      },
    }));

    res.status(200).json({ inboxMessages: formattedInbox });
  } catch (error) {
    console.error(
      `Error retrieving inbox messages for user ${req.params.id}:`,
      error
    );
    res.status(500).json({
      error: "Internal server error during inbox messages retrieval.",
    });
  }
};
