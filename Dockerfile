# Robust Root Dockerfile for VibeTeams
FROM node:20

WORKDIR /app

# Disable telemetry to save memory/time
ENV NEXT_TELEMETRY_DISABLED=1

# Copy all configuration files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY shared/package*.json ./shared/

# Install dependencies (root + workspaces)
RUN npm install

# Copy all source code
COPY . .

# Build the frontend workspace
RUN npm run build -w frontend

# Use the frontend directory for the final execution
WORKDIR /app/apps/frontend

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
