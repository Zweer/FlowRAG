# Schema Definition

The schema tells FlowRAG what kinds of entities and relations to look for in your documents. It's **flexible** — if the LLM finds something not in your list, it falls back to `Other`.

## Basic Schema

```typescript
import { defineSchema } from '@flowrag/core';

const schema = defineSchema({
  entityTypes: ['SERVICE', 'DATABASE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['USES', 'PRODUCES', 'CONSUMES', 'OWNS'],
});
```

The schema provides helper methods:

```typescript
schema.isValidEntityType('SERVICE');      // true
schema.isValidEntityType('UNKNOWN');      // false
schema.normalizeEntityType('SERVICE');    // 'SERVICE'
schema.normalizeEntityType('UNKNOWN');    // 'Other'
```

## Custom Fields

Add structured metadata to entities, relations, and documents:

```typescript
const schema = defineSchema({
  entityTypes: ['SERVICE', 'PROTOCOL', 'TEAM'],
  relationTypes: ['PRODUCES', 'CONSUMES', 'OWNS'],

  // Track document origin
  documentFields: {
    domain: { type: 'string', filterable: true },
    system: { type: 'string', filterable: true },
    version: { type: 'string' },
  },

  // Track entity status and ownership
  entityFields: {
    status: { type: 'enum', values: ['active', 'deprecated'], default: 'active' },
    owner: { type: 'string' },
  },

  // Describe how services communicate
  relationFields: {
    dataFormat: { type: 'string' },
    syncType: { type: 'enum', values: ['sync', 'async'] },
  },
});
```

### Field Types

| Type | Description | Options |
|------|-------------|---------|
| `string` | Free-form text | `filterable`, `default` |
| `enum` | One of predefined values | `values` (required), `filterable`, `default` |

Custom fields are passed to the LLM extractor, which populates them during entity extraction. They're stored alongside entities and relations in the graph storage.

## Schema Design Tips

- **Be specific**: `SERVICE`, `DATABASE`, `API` are better than generic `THING`
- **Match your domain**: Use terms your team already uses
- **Don't over-specify**: The LLM handles edge cases with `Other`
- **Use custom fields** for metadata that helps filtering, not for entity identity
