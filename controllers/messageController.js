// controllers/messageController.js
const db = require('../models'); // Import the database connection and models
const { User, Message, MessageRecipient, sequelize } = db; // Destructure necessary models and sequelize instance
const { Op } = require('sequelize'); // Import Op for complex queries

/**
 * @desc Send a message to one or more recipients
 * @route POST /messages
 * @access Public (for now, would be authenticated in real app)
 * @body {string} senderId - UUID of the sender
 * @body {string[]} recipientIds - Array of UUIDs of recipients
 * @body {string} [subject] - Optional subject of the message
 * @body {string} content - Content of the message
 */
exports.sendMessage = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction(); // Start a transaction for atomicity
    const { senderId, recipientIds, subject, content } = req.body;

    // Basic input validation
    if (
      !senderId ||
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0 ||
      !content
    ) {
      await transaction.rollback();
      return res.status(400).json({
        error:
          'Sender ID, at least one recipient ID, and content are required.',
      });
    }

    // Check if sender exists
    const sender = await User.findByPk(senderId, { transaction });
    if (!sender) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sender not found.' });
    }

    // Filter out duplicate recipient IDs and ensure sender is not a recipient
    const uniqueRecipientIds = [...new Set(recipientIds)].filter(
      (id) => id !== senderId
    );

    if (uniqueRecipientIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        error:
          'No valid recipients provided. Recipients cannot be the sender, and duplicates are removed.',
      });
    }

    // Check if all unique recipients exist
    const recipients = await User.findAll({
      where: {
        id: {
          [Op.in]: uniqueRecipientIds,
        },
      },
      transaction,
    });

    if (recipients.length !== uniqueRecipientIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'One or more recipient IDs are invalid or do not exist.',
      });
    }

    // Create the message
    const message = await Message.create(
      {
        senderId,
        subject,
        content,
        timestamp: new Date(), // Set current timestamp
      },
      { transaction }
    );

    // Create message recipient entries for each unique recipient
    const messageRecipientsData = uniqueRecipientIds.map((recipientId) => ({
      messageId: message.id,
      recipientId: recipientId,
      read: false, // Default to unread
    }));

    await MessageRecipient.bulkCreate(messageRecipientsData, { transaction });

    await transaction.commit(); // Commit the transaction

    res.status(201).json({
      message: 'Message sent successfully',
      sentMessage: {
        id: message.id,
        senderId: message.senderId,
        subject: message.subject,
        content: message.content,
        timestamp: message.timestamp,
        recipients: uniqueRecipientIds, // Confirm unique recipients
      },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback(); // Rollback on error
    }
    console.error('Error sending message:', error);
    res
      .status(500)
      .json({ error: 'Internal server error during message sending.' });
  }
};

/**
 * @desc View a specific message with all its recipients
 * @route GET /messages/:id
 * @access Public
 * @param {string} id - Message ID
 */
exports.getMessageWithRecipients = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is the message ID

    // Find the message by its primary key (ID)
    // Include the sender's details and all associated message recipients
    const message = await Message.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sender', // Alias defined in models/index.js for sender association
          attributes: ['id', 'name', 'email'], // Select specific attributes for sender
        },
        {
          model: MessageRecipient,
          as: 'recipients', // Alias defined in models/index.js for recipients association
          attributes: ['id', 'recipientId', 'read', 'readAt'], // Select specific attributes for recipient status
          include: {
            model: User,
            as: 'recipient', // Alias for the actual recipient user
            attributes: ['id', 'name', 'email'], // Select specific attributes for recipient user
          },
        },
      ],
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    res.status(200).json({ message });
  } catch (error) {
    console.error(
      `Error retrieving message ${req.params.id} with recipients:`,
      error
    ); // More specific error logging
    res
      .status(500)
      .json({ error: 'Internal server error during message retrieval.' });
  }
};

/**
 * @desc Mark a message as read
 * @route PATCH /message-recipients/:id/mark-read
 * @access Public
 * @param {string} id - MessageRecipient ID
 */
exports.markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is the MessageRecipient ID

    const messageRecipient = await MessageRecipient.findByPk(id);

    if (!messageRecipient) {
      return res
        .status(404)
        .json({ error: 'Message recipient entry not found.' });
    }

    if (messageRecipient.read) {
      return res
        .status(200)
        .json({ message: 'Message already marked as read.' });
    }

    messageRecipient.read = true;
    messageRecipient.readAt = new Date(); // Set read timestamp
    await messageRecipient.save();

    res.status(200).json({
      message: 'Message marked as read successfully.',
      messageRecipient: {
        id: messageRecipient.id,
        messageId: messageRecipient.messageId,
        recipientId: messageRecipient.recipientId,
        read: messageRecipient.read,
        readAt: messageRecipient.readAt,
      },
    });
  } catch (error) {
    console.error(
      `Error marking message recipient ${req.params.id} as read:`,
      error
    ); // More specific error logging
    res
      .status(500)
      .json({ error: 'Internal server error during marking message as read.' });
  }
};
