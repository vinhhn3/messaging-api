// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load environment variables from .env file

const env = process.env.NODE_ENV || "development"; // Default to 'development'

let sequelize;

if (env === "production" || process.env.DATABASE_URL) {
  // Use DATABASE_URL for PostgreSQL in production or if explicitly set
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false, // Set to true to see SQL queries
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for some PostgreSQL providers (e.g., Heroku, Render)
      },
    },
  });
} else {
  // Use SQLite for development and test environments
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: `./database.${env}.sqlite`, // Separate SQLite files for dev/test
    logging: false,
  });
}

module.exports = sequelize;
