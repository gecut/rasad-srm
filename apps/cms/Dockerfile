FROM node:24.21.0-alpine AS build

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cms/package.json apps/cms/package.json
COPY apps/panel/package.json apps/panel/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/cms apps/cms
COPY packages/contracts packages/contracts
ENV NEXT_TELEMETRY_DISABLED=1
# Build-only placeholders satisfy Payload config loading; no real credentials enter the image.
RUN PAYLOAD_SECRET=build-only-placeholder-not-for-runtime \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    pnpm --filter @rasad/cms build

FROM node:24.21.0-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/apps/cms/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/cms/.next/static ./apps/cms/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/cms/server.js"]
