// app.js
const express = require("express");
const dotenv = require("dotenv");
const db = require("./models"); // Import your database connection and models
const userRoutes = require("./routes/userRoutes"); // Import user routes
const messageRoutes = require("./routes/messageRoutes"); // Import message routes

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000; // Use port from .env or default to 8000

// Middleware to parse JSON request bodies
app.use(express.json());

// Basic route for testing server status
app.get("/", (req, res) => {
  res.status(200).json({ message: "Messaging System API is running!" });
});

// Use user routes
app.use("/users", userRoutes);
app.use("/messages", messageRoutes);

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Synchronize models with the database and start the server
db.sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");
    // In development, you can use `sync({ alter: true })` to update table schemas.
    // In production, you should rely on migrations (`npm run migrate`).
    // For this exercise, we'll use sync for convenience, but migrations are preferred.
    return db.sequelize.sync({ alter: true }); // Use { force: true } to drop and re-create tables (DANGER!)
  })
  .then(() => {
    console.log("Database models synchronized.");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Access the API at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to the database or sync models:", err);
  });

module.exports = app; // Export the app for testing purposes
