import type { Entity, GraphStorage } from '@flowrag/core';

export async function resolveEntity(graph: GraphStorage, name: string): Promise<Entity> {
  // 1. Exact match (entity names are used as IDs in FlowRAG)
  const exact = await graph.getEntity(name);
  if (exact) return exact;

  // 2. Case-insensitive / substring match
  const all = await graph.getEntities();
  const lower = name.toLowerCase();

  const caseMatch = all.find((e) => e.name.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  const substring = all.find((e) => e.name.toLowerCase().includes(lower));
  if (substring) return substring;

  throw new Error(`Entity not found: "${name}"`);
}
