FROM node:24.21.0-alpine AS build

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cms/package.json apps/cms/package.json
COPY apps/panel/package.json apps/panel/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/panel apps/panel
COPY packages/contracts packages/contracts
ARG VITE_CMS_URL
ENV VITE_CMS_URL=$VITE_CMS_URL
RUN pnpm --filter @rasad/panel build

FROM ghcr.io/gecut/nginx/spa:1.0.0 AS runtime
COPY --from=build --chown=nginx:nginx /app/apps/panel/dist/ /data/
EXPOSE 80
