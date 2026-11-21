# One image: the API and the built app, served from the same origin.
# Dokploy builds with --target runtime, so the final stage must keep that name.

# The commit this image was built from, for /api/health. Falls back to "unknown" outside a git checkout.
FROM alpine/git:latest AS gitsha
WORKDIR /repo
COPY . .
RUN (git rev-parse --short HEAD 2>/dev/null || echo unknown) > /git-sha

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production TZ=UTC HOST=0.0.0.0 PORT=3333 NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
# The server bundle carries its own dependencies, so the runtime needs no node_modules.
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=gitsha /git-sha ./.git-sha
USER node
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3333/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist-server/index.cjs"]
