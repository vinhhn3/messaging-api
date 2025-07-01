// config/config.js
require("dotenv").config(); // Ensure environment variables are loaded

// Import the configured sequelize instance to extract its options
const sequelize = require("./database");

module.exports = {
  development: {
    dialect: sequelize.options.dialect,
    storage: sequelize.options.storage, // Only for SQLite
    url: sequelize.options.url, // Only for PostgreSQL
    dialectOptions: sequelize.options.dialectOptions, // For PostgreSQL SSL
  },
  test: {
    dialect: sequelize.options.dialect,
    storage: sequelize.options.storage,
    url: sequelize.options.url,
    dialectOptions: sequelize.options.dialectOptions,
  },
  production: {
    dialect: sequelize.options.dialect,
    storage: sequelize.options.storage,
    url: sequelize.options.url,
    dialectOptions: sequelize.options.dialectOptions,
  },
};
