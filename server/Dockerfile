# Multi-stage build. The final image keeps full node_modules (including the
# prisma CLI) rather than pruning to production-only deps, so the container
# can run `prisma migrate deploy` on startup without a separate deploy step.

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
# su-exec drops from root to node at runtime, after the entrypoint has had
# a chance to chown the /app/uploads volume mount (which Docker preserves
# as root-owned from before this image ran non-root) — see entrypoint.sh.
RUN apk add --no-cache openssl su-exec
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/uploads && chown -R node:node /app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://localhost:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
