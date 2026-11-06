# ==============================================================================
# CrewFlow Backend - Multi-stage Dockerfile
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests, Prisma schema, and Prisma config
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy TypeScript source and configs
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript
RUN npm run build

# Prune devDependencies for a lean production footprint
RUN npm prune --production

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

# Run as non-root user for security
USER node

# Copy production artifacts from builder
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3000

# Health check probe against CrewFlow liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
