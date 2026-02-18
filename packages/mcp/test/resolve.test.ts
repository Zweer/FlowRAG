import type { Entity, GraphStorage } from '@flowrag/core';
import { describe, expect, it, vi } from 'vitest';

import { resolveEntity } from '../src/resolve.js';

function createMockGraph(entities: Entity[]): GraphStorage {
  return {
    getEntity: vi.fn(async (id: string) => entities.find((e) => e.id === id) ?? null),
    getEntities: vi.fn(async () => entities),
    addEntity: vi.fn(),
    addRelation: vi.fn(),
    getRelations: vi.fn(async () => []),
    traverse: vi.fn(async () => []),
    findPath: vi.fn(async () => []),
    deleteEntity: vi.fn(),
    deleteRelation: vi.fn(),
  };
}

const entities: Entity[] = [
  {
    id: 'AuthService',
    name: 'AuthService',
    type: 'SERVICE',
    description: 'Auth',
    sourceChunkIds: [],
  },
  { id: 'PostgreSQL', name: 'PostgreSQL', type: 'DATABASE', description: 'DB', sourceChunkIds: [] },
  {
    id: 'Kafka',
    name: 'Kafka',
    type: 'SERVICE',
    description: 'Message broker',
    sourceChunkIds: [],
  },
];

describe('resolveEntity', () => {
  it('resolves by exact match (ID)', async () => {
    const graph = createMockGraph(entities);
    const result = await resolveEntity(graph, 'AuthService');
    expect(result.name).toBe('AuthService');
  });

  it('resolves by case-insensitive match', async () => {
    const graph = createMockGraph(entities);
    // getEntity returns null for lowercase, falls through to case-insensitive
    (graph.getEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await resolveEntity(graph, 'authservice');
    expect(result.name).toBe('AuthService');
  });

  it('resolves by substring match', async () => {
    const graph = createMockGraph(entities);
    (graph.getEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await resolveEntity(graph, 'auth');
    expect(result.name).toBe('AuthService');
  });

  it('throws when entity not found', async () => {
    const graph = createMockGraph(entities);
    (graph.getEntity as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(resolveEntity(graph, 'NonExistent')).rejects.toThrow('Entity not found');
  });
});
