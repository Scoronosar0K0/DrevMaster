# Use the official Node.js 18 runtime as a parent image
FROM node:18-alpine

# Install bash for our startup script
RUN apk add --no-cache bash

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies first (including dev for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Create the database directory and set permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Make start script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV JWT_SECRET=drevmaster-secret-key-2024
ENV PORT=3000

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Expose the port the app runs on
EXPOSE $PORT

# Start the application using our script
CMD ["/app/start.sh"] 