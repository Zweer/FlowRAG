import { describe, expect, it } from 'vitest';

import { buildExtractionPrompt } from '../src/prompt.js';
import { defineSchema } from '../src/schema.js';

describe('buildExtractionPrompt', () => {
  it('should build basic prompt with entity and relation types', () => {
    const schema = defineSchema({
      entityTypes: ['SERVICE', 'DATABASE'],
      relationTypes: ['USES', 'PRODUCES'],
    });

    const prompt = buildExtractionPrompt('Some content about services', [], schema);

    expect(prompt).toContain('Entity types: SERVICE, DATABASE');
    expect(prompt).toContain('Relation types: USES, PRODUCES');
    expect(prompt).toContain('Some content about services');
    expect(prompt).not.toContain('Known entities');
  });

  it('should include known entities when provided', () => {
    const schema = defineSchema({
      entityTypes: ['SERVICE'],
      relationTypes: ['USES'],
    });

    const prompt = buildExtractionPrompt('content', ['AuthService', 'DB'], schema);

    expect(prompt).toContain('Known entities to reference: AuthService, DB');
  });

  it('should include custom entity fields', () => {
    const schema = defineSchema({
      entityTypes: ['SERVICE'],
      relationTypes: ['USES'],
      entityFields: { status: { type: 'enum', values: ['active', 'deprecated'] } },
    });

    const prompt = buildExtractionPrompt('content', [], schema);

    expect(prompt).toContain('Entity custom fields:');
    expect(prompt).toContain('"fields": {}');
  });

  it('should include custom relation fields', () => {
    const schema = defineSchema({
      entityTypes: ['SERVICE'],
      relationTypes: ['USES'],
      relationFields: { syncType: { type: 'enum', values: ['sync', 'async'] } },
    });

    const prompt = buildExtractionPrompt('content', [], schema);

    expect(prompt).toContain('Relation custom fields:');
  });
});
