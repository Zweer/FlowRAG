import { describe, expect, it } from 'vitest';

import { defineSchema } from '../src/schema.ts';

describe('defineSchema', () => {
  const schema = defineSchema({
    entityTypes: ['SERVICE', 'DATABASE'] as const,
    relationTypes: ['USES', 'OWNS'] as const,
  });

  it('validates known entity types', () => {
    expect(schema.isValidEntityType('SERVICE')).toBe(true);
    expect(schema.isValidEntityType('UNKNOWN')).toBe(false);
  });

  it('normalizes entity types with Other fallback', () => {
    expect(schema.normalizeEntityType('SERVICE')).toBe('SERVICE');
    expect(schema.normalizeEntityType('UNKNOWN')).toBe('Other');
  });

  it('validates known relation types', () => {
    expect(schema.isValidRelationType('USES')).toBe(true);
    expect(schema.isValidRelationType('UNKNOWN')).toBe(false);
  });

  it('normalizes relation types with Other fallback', () => {
    expect(schema.normalizeRelationType('OWNS')).toBe('OWNS');
    expect(schema.normalizeRelationType('UNKNOWN')).toBe('Other');
  });

  it('throws on empty entity types', () => {
    expect(() => defineSchema({ entityTypes: [], relationTypes: ['A'] as const })).toThrow();
  });

  it('throws on empty relation types', () => {
    expect(() => defineSchema({ entityTypes: ['A'] as const, relationTypes: [] })).toThrow();
  });

  it('should have empty custom fields by default', () => {
    expect(schema.documentFields).toEqual({});
    expect(schema.entityFields).toEqual({});
    expect(schema.relationFields).toEqual({});
  });

  it('should accept custom field definitions', () => {
    const s = defineSchema({
      entityTypes: ['SERVICE'] as const,
      relationTypes: ['USES'] as const,
      documentFields: { domain: { type: 'string', filterable: true } },
      entityFields: {
        status: { type: 'enum', values: ['active', 'deprecated'], default: 'active' },
      },
      relationFields: { syncType: { type: 'enum', values: ['sync', 'async'] } },
    });

    expect(s.documentFields.domain).toEqual({ type: 'string', filterable: true });
    expect(s.entityFields.status.values).toEqual(['active', 'deprecated']);
    expect(s.relationFields.syncType.type).toBe('enum');
  });
});
