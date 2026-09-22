# I am choosing to use Vite+ here JUST because it has a very convenient method
# to provide a portable Node.js binary to later steps.
# Don't ask why I'm doing it like that. Just trust.
FROM ghcr.io/voidzero-dev/vite-plus:1.0.0-rc.0 AS build
WORKDIR /app
ENV CI=true

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp i --frozen-lockfile

COPY --chown=vp:vp . .
RUN vp run build

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM node:24.14.0-alpine AS deps
WORKDIR /app
ENV CI=true

RUN apk add git wget tar g++ make py3-pip
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile --prod

FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=deps /app ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/dynamic-data ./dynamic-data-template

CMD cp -r dynamic-data-template dynamic-data && node dist/main.mjs