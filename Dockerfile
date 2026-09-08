# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# A speed test in one container: the UI, the measurement endpoints, telemetry
# storage and result sharing. It needs no other service, and once built it
# makes no outbound connections — the ISP database and the fonts travel with
# the image, so it runs on a network with no route to the internet.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=20-bookworm-slim

# --- Dependencies ----------------------------------------------------------
# better-sqlite3 is native. It publishes prebuilt binaries for common
# platforms and falls back to compiling, so the toolchain is present to keep
# uncommon architectures buildable rather than broken.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# --- Runtime dependencies --------------------------------------------------
# Resolved separately so the final image never carries the build-only tree.
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Next installs a platform SWC binary and sharp for its build and image
# pipelines. Neither is reachable here: nothing is compiled after the build,
# and no next/image is used — the share card is rendered by next/og, which uses
# Satori and resvg rather than sharp. Together they are roughly 300 MB of an
# image that has to be copied around an internal network.
RUN rm -rf node_modules/@next/swc-* node_modules/@img node_modules/sharp

# --- Build -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Only needed when serving from a subdirectory; Next compiles it into asset
# URLs, so it cannot be changed after the build.
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

RUN npm run build

# --- Runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH=""
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SPEEDTEST_DATA_DIR=/app/data \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY --from=prod-deps /app/node_modules ./node_modules
# The build cache is worth hundreds of megabytes and is meaningless at runtime.
COPY --from=builder /app/.next ./.next
RUN rm -rf .next/cache
COPY --from=builder /app/public ./public
# Read at runtime rather than imported: the offline ISP database and the TTFs
# the share-image renderer hands to Satori.
COPY --from=builder /app/assets ./assets
COPY package.json next.config.mjs server.mjs ./

# Writable state — the SQLite database and the generated share-id salt — lives
# here and nowhere else, so this is the only path that needs to be a volume.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

# Hits the real ping endpoint, so the check fails if measurement is broken
# rather than merely if the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/empty').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
