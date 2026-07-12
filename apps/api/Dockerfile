# CBC Content Engine — standalone Node service (no monorepo/workspace deps).
# A Dockerfile makes the Railway build deterministic: with Root Directory set
# to apps/api, Railway detects this file and uses it, bypassing builder
# auto-detection (which mixed npm with cached pnpm node_modules and failed).
FROM node:22-slim

WORKDIR /app

# Install production deps first for layer caching
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# App source + config
COPY src ./src
COPY config ./config

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
