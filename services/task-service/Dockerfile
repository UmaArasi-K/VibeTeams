FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy built application
COPY dist/ ./dist/

EXPOSE 8080

CMD ["node", "dist/index.js"]
