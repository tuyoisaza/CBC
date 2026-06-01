FROM alpine:latest

RUN apk add --no-cache nodejs npm openssl git
RUN npm install -g pnpm@11.0.9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/db/schema.prisma packages/db/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --filter=@cbc/web

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
