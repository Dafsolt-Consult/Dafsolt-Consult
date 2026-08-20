# Builds the SPA, then serves the static bundle with Caddy — which also
# reverse-proxies /api and /health to the server container and gets
# automatic Let's Encrypt HTTPS for the domain set in Caddyfile.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Non-root: the caddy binary in this image already carries the
# cap_net_bind_service file capability, so it can still bind :80/:443
# while running as uid 1001 instead of root.
USER 1001:1001
EXPOSE 80 443
