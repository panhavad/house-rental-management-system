# syntax=docker/dockerfile:1

# RentalHRM production image
# - Next.js 16 (App Router) + Prisma 6 + SQLite
# - Multi-stage build: install deps once, build with dev deps, run with prod-only deps
# - The SQLite database file and uploaded contract documents are expected to live on
#   mounted volumes (see docker-compose.yml) so they survive image rebuilds/restarts.
ARG NODE_VERSION=20-alpine

########## Base: OS packages needed by Prisma's query engine and sharp ##########
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
# `prisma generate` requires DATABASE_URL to be set (it validates the datasource
# block, even though generate itself never connects to it), and NextAuth validates
# AUTH_SECRET/NEXTAUTH_URL exist as soon as its module is loaded (which happens while
# `next build` collects route data). None of these placeholders are ever used to
# serve real traffic — docker-compose always supplies the real values at run time,
# which take precedence over anything baked into the image.
ENV DATABASE_URL="file:./build-placeholder.db"
ENV AUTH_SECRET="build-placeholder-not-used-at-runtime"
ENV NEXTAUTH_URL="http://localhost:3000"

########## deps: install every dependency (needed to build) ##########
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

########## builder: compile the Next.js app ##########
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

########## prod-deps: install production-only dependencies ##########
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

########## runner: minimal final image ##########
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Normalize line endings in case the script was ever edited on Windows, then make it
# executable; create the volume mount points with correct ownership up front.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
    && chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/data/uploads \
    && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
