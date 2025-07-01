// models/index.js
const sequelize = require("../config/database"); // Import the configured sequelize instance
const { DataTypes } = require("sequelize"); // Import DataTypes for associations if needed

const db = {};

// Import models
db.User = require("./User")(sequelize);
db.Message = require("./Message")(sequelize);
db.MessageRecipient = require("./MessageRecipient")(sequelize);

// Define Associations (Relationships)
// User and Message (Sender)
db.User.hasMany(db.Message, {
  foreignKey: "senderId",
  as: "sentMessages",
  onDelete: "CASCADE",
});
db.Message.belongsTo(db.User, {
  foreignKey: "senderId",
  as: "sender",
});

// Message and MessageRecipient
db.Message.hasMany(db.MessageRecipient, {
  foreignKey: "messageId",
  as: "recipients",
  onDelete: "CASCADE",
});
db.MessageRecipient.belongsTo(db.Message, {
  foreignKey: "messageId",
  as: "message",
});

// User and MessageRecipient (Recipient)
db.User.hasMany(db.MessageRecipient, {
  foreignKey: "recipientId",
  as: "receivedMessages",
  onDelete: "CASCADE",
});
db.MessageRecipient.belongsTo(db.User, {
  foreignKey: "recipientId",
  as: "recipient",
});

db.sequelize = sequelize;
// db.Sequelize = Sequelize; // Export Sequelize constructor as well

module.exports = db;
