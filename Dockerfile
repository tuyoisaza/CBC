FROM alpine:latest

RUN echo "=== Installing Node.js and dependencies ===" && \
    apk add --no-cache nodejs npm openssl git && \
    echo "=== Installing pnpm ===" && \
    npm install -g pnpm@11.0.9 && \
    echo "=== pnpm version ===" && \
    pnpm --version

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/db/schema.prisma packages/db/

RUN echo "=== Installing dependencies ===" && \
    pnpm install --frozen-lockfile

COPY . .

RUN echo "=== Building web app ===" && \
    pnpm build --filter=@cbc/web

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
