// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load environment variables from .env file

// For Testing purposes only

const env = process.env.NODE_ENV || "development"; // Default to 'development'

let sequelize;

// Parse the DATABASE_URL to check the hostname
const databaseUrl = process.env.DATABASE_URL;
let isLocalPostgres = false;
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    // Check if the hostname is 'db' (from docker-compose) or 'localhost'
    if (url.hostname === "db" || url.hostname === "localhost") {
      isLocalPostgres = true;
    }
  } catch (e) {
    console.warn(
      "Invalid DATABASE_URL format, cannot determine if local PostgreSQL:",
      e.message
    );
  }
}

if (env === "production" && databaseUrl) {
  // In production, require SSL by default, but disable if it's a known local PostgreSQL
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false, // Set to true to see SQL queries
    dialectOptions: {
      // If it's a local Docker PostgreSQL, explicitly disable SSL
      // Otherwise, require SSL for external production databases
      ssl: isLocalPostgres
        ? false
        : {
            require: true,
            rejectUnauthorized: false, // Often needed for cloud providers with self-signed certs
          },
    },
  });
} else if (databaseUrl) {
  // If DATABASE_URL is set but not in production, assume local/dev PostgreSQL without SSL
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: false, // Explicitly disable SSL for local PostgreSQL connections
    },
  });
} else {
  // Use SQLite for development and test environments if no DATABASE_URL is provided
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: `./database.${env}.sqlite`, // Separate SQLite files for dev/test
    logging: false,
  });
}

module.exports = sequelize;
