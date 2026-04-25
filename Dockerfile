# Debian-based image: go-ipfs postinstall ships a glibc binary (fails on Alpine/musl).
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/migrate.js ./migrate.js
COPY --from=builder /app/migrations ./migrations
RUN npm ci --omit=dev
ENV NODE_ENV=production
EXPOSE 5000
# Inline entrypoint avoids CRLF issues when the repo is checked out on Windows.
ENTRYPOINT ["sh", "-c", "echo '[entrypoint] DB migrate...' && node /app/migrate.js && echo '[entrypoint] Starting server...' && exec node /app/dist/index.js"]
