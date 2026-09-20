# Sinkroo GaiaBroker — monorepo multi-stage build.
# Build context: repo ROOT (see docker-compose.yml `build.context`).

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/engine/package.json packages/engine/
COPY packages/gaia/package.json packages/gaia/
COPY apps/api/package.json apps/api/
COPY apps/gaia-broker/package.json apps/gaia-broker/

RUN npm ci

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm run build --workspaces --if-present

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
COPY --from=build /app/package.json ./

WORKDIR /app/apps/gaia-broker
EXPOSE 3100
CMD ["node", "dist/index.js"]
