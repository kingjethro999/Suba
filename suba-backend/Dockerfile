FROM node:18-slim

# Create app dir
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production

# Expose the port your app listens on
EXPOSE 5000

# Start the server
CMD ["npm", "start"]