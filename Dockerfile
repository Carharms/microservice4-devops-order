# -- Build Stage --
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

# -- Production Stage --

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

# Copy the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application
CMD ["node", "index.js"]