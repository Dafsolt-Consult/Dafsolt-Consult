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

EXPOSE 80 443
