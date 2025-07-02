// app.js
const express = require('express');
const dotenv = require('dotenv');
const db = require('./models'); // Import your database connection and models
const userRoutes = require('./routes/userRoutes'); // Import user routes
const messageRoutes = require('./routes/messageRoutes'); // Import message routes

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000; // Use port from .env or default to 8000

// Middleware to parse JSON request bodies
app.use(express.json());

// Basic route for testing server status
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Messaging System API is running!' });
});

// Use user routes
app.use('/users', userRoutes);
app.use('/messages', messageRoutes);

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Synchronize models with the database and start the server
db.sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    if (process.env.NODE_ENV !== 'test') {
      return db.sequelize.sync({ alter: true });
    }
  })
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Database models synchronized.');
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Access the API at http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('Unable to connect to the database or sync models:', err);
  });

if (process.env.NODE_ENV === 'test') {
  // In test environment, we don't want app.js to start the server or sync models
  // The test suite will handle database synchronization and server startup.
  // This prevents the "Unable to connect to the database or sync models" error
  // that occurs when app.js tries to sync while tests are also syncing.
  console.log(
    'App.js is running in test environment. Skipping server start and model sync.'
  );
}

module.exports = app; // Export the app for testing purposes
