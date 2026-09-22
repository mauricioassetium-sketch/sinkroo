# Sinkroo API — monorepo multi-stage build.
# Build context: repo root.

# ── Stage 1: install + build all workspaces ────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copy workspace manifests first for layer caching.
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/engine/package.json packages/engine/
COPY packages/gaia/package.json packages/gaia/
COPY packages/deep-agents/package.json packages/deep-agents/
COPY apps/api/package.json apps/api/
COPY apps/gaia-broker/package.json apps/gaia-broker/

RUN npm ci

# Copy source and compile every workspace (api depends on core/engine/gaia).
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm run build --workspaces --if-present

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled output + manifests + node_modules (workspace symlinks).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
COPY --from=build /app/package.json ./

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]
