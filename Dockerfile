# Multi-stage build for OptionsRanker production

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --workspaces

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

RUN npm ci --workspaces --only=production

# Copy built application
COPY --from=builder /app/shared/dist ./shared/dist/
COPY --from=builder /app/server/dist ./server/dist/
COPY --from=builder /app/client/dist ./client/dist/

# Copy database setup
COPY --from=builder /app/server/src/db/schema.sql ./server/src/db/schema.sql

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/optionsranker.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Start the server
CMD ["npm", "start"]