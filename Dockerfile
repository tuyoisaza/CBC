FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build --filter=@cbc/web

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["sh", "-c", "pnpm --filter @cbc/db db:push --accept-data-loss && pnpm start --filter=@cbc/web"]
