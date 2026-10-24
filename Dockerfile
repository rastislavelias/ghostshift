FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS base

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM dependencies AS migrator
ENV CHECKPOINT_DISABLE=1
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts/migrate.mjs scripts/database-url.mjs ./scripts/
USER node
CMD ["node", "scripts/migrate.mjs"]

FROM dependencies AS worker-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM base AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S -g 1001 ghostshift && adduser -S -u 1001 -G ghostshift ghostshift
COPY --from=worker-dependencies --chown=ghostshift:ghostshift /app/node_modules ./node_modules
COPY --from=build --chown=ghostshift:ghostshift /app/dist ./worker
COPY package.json ./
USER ghostshift
CMD ["node", "worker/services/orchestrator/worker.js"]

FROM base AS fixture
WORKDIR /app
COPY tests/fixtures/provider.mjs ./provider.mjs
ENTRYPOINT ["node", "provider.mjs"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S -g 1001 ghostshift && adduser -S -u 1001 -G ghostshift ghostshift
COPY --from=build --chown=ghostshift:ghostshift /app/apps/console/.next/standalone ./
COPY --from=build --chown=ghostshift:ghostshift /app/apps/console/.next/static ./apps/console/.next/static
USER ghostshift
EXPOSE 3000
CMD ["node", "apps/console/server.js"]
