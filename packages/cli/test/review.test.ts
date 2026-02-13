import type { ExtractionResult } from '@flowrag/core';
import type { ExtractionContext } from '@flowrag/pipeline';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
}));

import { checkbox, input, select } from '@inquirer/prompts';

import { reviewExtraction } from '../src/review.js';

const mockCheckbox = vi.mocked(checkbox);
const mockSelect = vi.mocked(select);
const mockInput = vi.mocked(input);

const extraction: ExtractionResult = {
  entities: [
    { name: 'ServiceA', type: 'SERVICE', description: 'A service' },
    { name: 'DatabaseB', type: 'DATABASE', description: 'A database' },
  ],
  relations: [
    {
      source: 'ServiceA',
      target: 'DatabaseB',
      type: 'USES',
      description: 'Uses DB',
      keywords: ['data'],
    },
  ],
};

const context: ExtractionContext = {
  chunkId: 'chunk:1',
  documentId: 'doc:readme',
  content: 'ServiceA uses DatabaseB for storage.',
};

describe('reviewExtraction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should accept all entities and relations', async () => {
    mockCheckbox
      .mockResolvedValueOnce(extraction.entities)
      .mockResolvedValueOnce(extraction.relations);
    mockSelect.mockResolvedValueOnce('continue').mockResolvedValueOnce('done');

    const result = await reviewExtraction(extraction, context);

    expect(result.entities).toEqual(extraction.entities);
    expect(result.relations).toEqual(extraction.relations);
  });

  it('should filter relations when entity is removed', async () => {
    // Keep only ServiceA → relation to DatabaseB is auto-filtered
    mockCheckbox.mockResolvedValueOnce([extraction.entities[0]]);
    mockSelect.mockResolvedValueOnce('continue').mockResolvedValueOnce('done');

    const result = await reviewExtraction(extraction, context);

    expect(result.entities).toHaveLength(1);
    // Relations checkbox not called since all relations were filtered
    expect(mockCheckbox).toHaveBeenCalledTimes(1);
  });

  it('should show chunk content on demand', async () => {
    mockCheckbox
      .mockResolvedValueOnce(extraction.entities)
      .mockResolvedValueOnce(extraction.relations);
    mockSelect
      .mockResolvedValueOnce('show')
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('done');

    await reviewExtraction(extraction, context);

    expect(console.log).toHaveBeenCalledWith(context.content);
  });

  it('should add a new entity', async () => {
    mockCheckbox.mockResolvedValueOnce([]);
    mockSelect
      .mockResolvedValueOnce('add')
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('done');
    mockInput
      .mockResolvedValueOnce('NewEntity')
      .mockResolvedValueOnce('PROTOCOL')
      .mockResolvedValueOnce('A new protocol');

    const result = await reviewExtraction(extraction, context);

    expect(result.entities).toEqual([
      { name: 'NewEntity', type: 'PROTOCOL', description: 'A new protocol' },
    ]);
  });

  it('should edit an entity', async () => {
    const entity = { ...extraction.entities[0] };
    mockCheckbox.mockResolvedValueOnce([entity]).mockResolvedValueOnce([]);
    mockSelect
      .mockResolvedValueOnce('edit')
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('done');
    mockInput
      .mockResolvedValueOnce('RenamedService')
      .mockResolvedValueOnce('SERVICE')
      .mockResolvedValueOnce('Renamed');

    const result = await reviewExtraction(extraction, context);

    expect(result.entities[0].name).toBe('RenamedService');
  });

  it('should add a new relation', async () => {
    mockCheckbox.mockResolvedValueOnce(extraction.entities).mockResolvedValueOnce([]);
    mockSelect
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('add')
      .mockResolvedValueOnce('done');
    mockInput
      .mockResolvedValueOnce('kw1, kw2')
      .mockResolvedValueOnce('ServiceA')
      .mockResolvedValueOnce('DatabaseB')
      .mockResolvedValueOnce('CONNECTS')
      .mockResolvedValueOnce('Connects to DB');

    const result = await reviewExtraction(extraction, context);

    expect(result.relations).toEqual([
      {
        source: 'ServiceA',
        target: 'DatabaseB',
        type: 'CONNECTS',
        description: 'Connects to DB',
        keywords: ['kw1', 'kw2'],
      },
    ]);
  });

  it('should edit a relation', async () => {
    const relation = { ...extraction.relations[0] };
    mockCheckbox.mockResolvedValueOnce(extraction.entities).mockResolvedValueOnce([relation]);
    mockSelect
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('edit')
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce('done');
    mockInput
      .mockResolvedValueOnce('ServiceA')
      .mockResolvedValueOnce('DatabaseB')
      .mockResolvedValueOnce('DEPENDS_ON')
      .mockResolvedValueOnce('Depends on DB')
      .mockResolvedValueOnce('dep');

    const result = await reviewExtraction(extraction, context);

    expect(result.relations[0].type).toBe('DEPENDS_ON');
    expect(result.relations[0].keywords).toEqual(['dep']);
  });

  it('should handle empty entities', async () => {
    const empty: ExtractionResult = { entities: [], relations: [] };
    mockSelect.mockResolvedValueOnce('continue').mockResolvedValueOnce('done');

    const result = await reviewExtraction(empty, context);

    expect(result.entities).toEqual([]);
    expect(result.relations).toEqual([]);
    expect(mockCheckbox).not.toHaveBeenCalled();
  });

  it('should show chunk content in relation menu', async () => {
    mockCheckbox
      .mockResolvedValueOnce(extraction.entities)
      .mockResolvedValueOnce(extraction.relations);
    mockSelect
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('show')
      .mockResolvedValueOnce('done');

    await reviewExtraction(extraction, context);

    expect(console.log).toHaveBeenCalledWith(context.content);
  });
});
