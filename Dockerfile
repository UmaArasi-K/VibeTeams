# Optimized Root Dockerfile for VibeTeams Monorepo
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies for the whole repo if needed
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
WORKDIR /app/apps/frontend
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
