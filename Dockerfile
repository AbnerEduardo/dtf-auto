# DTF Auto Pro - Production Dockerfile
FROM node:22-alpine AS base

# Dependências necessárias para better-sqlite3 e Sharp
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# =========================
# Dependências
# =========================
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# =========================
# Build
# =========================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# =========================
# Produção
# =========================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/lib/schema.sql ./src/lib/schema.sql

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]