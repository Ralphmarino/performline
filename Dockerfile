# ---- build the client
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ---- runtime with Chromium for PDF export
FROM mcr.microsoft.com/playwright:v1.64.1-noble
ENV NODE_ENV=production PORT=8787
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 8787
CMD ["node", "server/src/index.js"]
