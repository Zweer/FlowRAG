/**
 * Schema definition for FlowRAG
 */

import { z } from 'zod';

/** Schema configuration input */
export interface SchemaConfig<
  E extends readonly string[] = readonly string[],
  R extends readonly string[] = readonly string[],
> {
  entityTypes: E;
  relationTypes: R;
}

/** Resolved schema with validation */
export interface Schema<
  E extends readonly string[] = readonly string[],
  R extends readonly string[] = readonly string[],
> {
  entityTypes: E;
  relationTypes: R;
  isValidEntityType: (type: string) => boolean;
  isValidRelationType: (type: string) => boolean;
  normalizeEntityType: (type: string) => E[number] | 'Other';
  normalizeRelationType: (type: string) => R[number] | 'Other';
}

const schemaConfigSchema = z.object({
  entityTypes: z.array(z.string()).min(1),
  relationTypes: z.array(z.string()).min(1),
});

/**
 * Define a schema for entity and relation types.
 * Types are suggestions - if LLM extracts a type not in the list, it falls back to 'Other'.
 */
export function defineSchema<
  const E extends readonly string[],
  const R extends readonly string[],
>(config: SchemaConfig<E, R>): Schema<E, R> {
  schemaConfigSchema.parse(config);

  const entitySet = new Set<string>(config.entityTypes);
  const relationSet = new Set<string>(config.relationTypes);

  return {
    entityTypes: config.entityTypes,
    relationTypes: config.relationTypes,
    isValidEntityType: (type: string) => entitySet.has(type),
    isValidRelationType: (type: string) => relationSet.has(type),
    normalizeEntityType: (type: string) =>
      entitySet.has(type) ? (type as E[number]) : 'Other',
    normalizeRelationType: (type: string) =>
      relationSet.has(type) ? (type as R[number]) : 'Other',
  };
}
