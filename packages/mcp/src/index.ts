#!/usr/bin/env node

export { createBearerAuthMiddleware } from './auth.js';
export type {
  AuthConfig,
  CliFlags,
  FlowRAGMcpConfig,
  GraphStorageConfig,
  KVStorageConfig,
  ProviderConfig,
  SchemaConfig,
  StorageConfig,
  VectorStorageConfig,
} from './config.js';
export type { FlowRAGInstance } from './factory.js';
export type { ConfigChange, FlowRAGMetadata } from './metadata.js';
export type { ServerHandle } from './server.js';

import { main } from './main.js';

main();
