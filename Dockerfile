FROM node:22-bookworm-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/ ./
COPY motifs.js picture-symmetries.js puzzle-engine.js /app/
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/kolam.sqlite
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","index.mjs"]
