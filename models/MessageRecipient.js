// models/MessageRecipient.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageRecipient = sequelize.define(
    'MessageRecipient',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      messageId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'message_id',
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'recipient_id',
      },
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at',
      },
    },
    {
      tableName: 'message_recipients',
      timestamps: false,
    }
  );

  return MessageRecipient;
};
