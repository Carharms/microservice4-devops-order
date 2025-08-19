# Stage 1: Build Stage
# Use a Node.js base image to install dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Stage 2: Production Stage
# Use a lean Node.js base image for the final production container
FROM node:18-alpine

WORKDIR /app

# Copy only the installed dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application
CMD ["node", "index.js"]