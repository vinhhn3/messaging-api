# Use a production-ready Node.js base image
# node:18-alpine is a good choice for smaller image size
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
# This allows caching of dependencies
COPY package*.json ./

# Install project dependencies
# Using npm ci for clean installs in CI/CD environments
RUN npm ci --only=production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port your Express app listens on
EXPOSE 8000

# Command to run the application
# Using 'npm start' which should be defined in your package.json
CMD ["npm", "start"]
