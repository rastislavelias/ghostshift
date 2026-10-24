FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S -g 1001 ghostshift && adduser -S -u 1001 -G ghostshift ghostshift
COPY --from=build --chown=ghostshift:ghostshift /app/apps/console/.next/standalone ./
COPY --from=build --chown=ghostshift:ghostshift /app/apps/console/.next/static ./apps/console/.next/static
COPY --chown=ghostshift:ghostshift scripts/migrate.mjs scripts/entrypoint.sh ./scripts/
COPY --chown=ghostshift:ghostshift db ./db
USER ghostshift
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/entrypoint.sh"]
