FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:24-slim
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY flowrag.config.json .

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r})" || exit 1

ENTRYPOINT ["node", "node_modules/@flowrag/mcp/dist/index.mjs"]
CMD ["--config", "flowrag.config.json"]
