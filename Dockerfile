# Root Dockerfile for VibeTeams (Main App / Frontend)
# This allows 'gcloud run deploy --source ./' to work from the root.

# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Copy the entire monorepo to handle local workspace dependencies if needed
COPY . .

# Build the frontend
WORKDIR /app/apps/frontend
RUN npm install
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Copy built assets from the frontend directory
COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "start"]
