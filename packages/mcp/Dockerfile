FROM node:24-slim
WORKDIR /app

# Install FlowRAG MCP server and desired storage/provider packages
# Customize this line based on your storage backends:
RUN npm install --no-save \
  @flowrag/mcp \
  @flowrag/storage-redis \
  @flowrag/storage-opensearch \
  @flowrag/provider-bedrock

# Copy config and env
COPY flowrag.config.json .
COPY .env .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r})" || exit 1

CMD ["npx", "@flowrag/mcp", "--config", "flowrag.config.json"]
