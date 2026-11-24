# One image: the API and the built app, served from the same origin.
# Dokploy builds with --target runtime, so the final stage must keep that name.

# Require build-time source provenance for the revision reported by /api/health.
FROM alpine/git@sha256:29cff25811f790b9f72fc266bf8009a5a911714c0e03c31c47339c50909d9aef AS gitsha
WORKDIR /repo
COPY . .
# Object history, remotes, credentials and reflogs are excluded from the build context.
# A builder that omits Git refs may inject the checked-out full SHA at build time.
ARG BUILD_REVISION
RUN set -eu; mkdir -p .git/objects .git/refs; \
    checkout="$(git rev-parse --verify HEAD 2>/dev/null || true)"; \
    archive="$(cat .source-revision)"; \
    if [ "$archive" = '$Format:%H$' ]; then archive=''; fi; \
    revision="${checkout:-${archive:-${BUILD_REVISION:-}}}"; \
    if ! printf '%s' "$revision" | grep -Eq '^[0-9a-f]{40}$' || [ "${#revision}" != 40 ]; then \
      echo 'Missing valid source revision: build from a Git checkout, git archive, or pass its verified full SHA as BUILD_REVISION.' >&2; exit 1; \
    fi; \
    for supplied in "$archive" "${BUILD_REVISION:-}"; do \
      if [ -n "$supplied" ] && [ "$supplied" != "$revision" ]; then echo 'Conflicting source revisions.' >&2; exit 1; fi; \
    done; \
    printf '%.12s\n' "$revision" > /git-sha

FROM node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=kachka-npm,target=/root/.npm npm ci --prefer-offline --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS runtime
ENV NODE_ENV=production TZ=UTC HOST=0.0.0.0 PORT=3333 NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
# The server bundle carries its own dependencies, so the runtime needs no node_modules.
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=gitsha /git-sha ./.git-sha
USER node
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '3333') + '/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist-server/index.cjs"]
