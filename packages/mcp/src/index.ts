#!/usr/bin/env node

export type { CliFlags, FlowRAGMcpConfig, ProviderConfig, SchemaConfig } from './config.js';
export type { FlowRAGInstance } from './factory.js';
export type { ConfigChange, FlowRAGMetadata } from './metadata.js';

import { main } from './main.js';

main();
