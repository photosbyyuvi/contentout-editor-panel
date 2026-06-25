# Backend container for the Contentout Team Portal API (server/).
# The frontend deploys separately as a static site (see vercel.json / DEPLOYMENT.md).
FROM node:22-slim

WORKDIR /app

# Install production deps (better-sqlite3 ships prebuilt binaries)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

ENV NODE_ENV=production
ENV PORT=8787
ENV SQLITE_PATH=/data/portal.db
# Mount a persistent volume at /data so the database survives restarts.
VOLUME ["/data"]
EXPOSE 8787

CMD ["node", "server/index.js"]
