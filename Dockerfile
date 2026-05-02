# Optimized Root Dockerfile using npm workspaces
FROM node:20-slim AS builder
WORKDIR /app

# Copy workspace configuration and manifests
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY shared/package*.json ./shared/

# Install dependencies using workspaces
RUN npm install

# Copy source code
COPY . .

# Build the frontend package
RUN npm run build -w frontend

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Copy production assets from builder
COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
