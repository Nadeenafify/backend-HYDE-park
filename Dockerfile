# --- Build stage: compile TypeScript to dist/ -------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Install ALL deps (incl. dev) so `nest build` is available.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage: only prod deps + compiled output ------------------------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Receipts are written here. On Fly this is ephemeral unless a volume is
# mounted at /app/uploads (see fly.toml note).
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/main"]
