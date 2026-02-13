import type { Client } from '@opensearch-project/opensearch';

export interface OpenSearchClientOptions {
  client: Client;
  indexPrefix?: string;
}
