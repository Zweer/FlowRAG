# FlowRAG v1.1 Requirements - Package Restructuring

> Refactoring specification for FlowRAG package organization - moving from type-based to provider-based structure.

## 1. Overview

### 1.1 Current Problems

The current package structure is **inconsistent** and **fragmented**:

**Storage packages** (type-based):
- `@flowrag/storage-json` → only KV storage
- `@flowrag/storage-sqlite` → only Graph storage  
- `@flowrag/storage-lancedb` → only Vector storage

**AI packages** (mixed approach):
- `@flowrag/embedder-local` → only Embedder
- `@flowrag/embedder-gemini` → only Embedder
- `@flowrag/llm-gemini` → only LLM Extractor

### 1.2 Target Structure

Move to **provider-based packages** for better cohesion and user experience:

```
@flowrag/provider-gemini    # Gemini AI services
@flowrag/provider-local     # Local AI services
@flowrag/storage-sqlite     # SQLite-based storage
@flowrag/storage-json       # File-based storage
@flowrag/storage-lancedb    # Vector-specialized storage
```

## 2. Migration Plan

### 2.1 New Package Structure

#### AI Providers

**`@flowrag/provider-gemini`** (replaces `embedder-gemini` + `llm-gemini`):
```typescript
// Unified Gemini provider
export class GeminiProvider {
  constructor(options: { apiKey?: string; model?: string });
  
  // Embedder interface
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  
  // Extractor interface  
  extractEntities(content: string, knownEntities: string[], schema: Schema): Promise<ExtractionResult>;
}

// Individual exports for compatibility
export { GeminiEmbedder } from './embedder.js';
export { GeminiExtractor } from './extractor.js';
```

**`@flowrag/provider-local`** (replaces `embedder-local` + future `llm-local`):
```typescript
// Unified local provider
export class LocalProvider {
  constructor(options: { embeddingModel?: string; extractorModel?: string });
  
  // Embedder interface
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  
  // Future: Local LLM extractor
  extractEntities(content: string, knownEntities: string[], schema: Schema): Promise<ExtractionResult>;
}

// Individual exports
export { LocalEmbedder } from './embedder.js';
export { LocalExtractor } from './extractor.js'; // Future
```

#### Storage Providers

**`@flowrag/storage-sqlite`** (enhanced):
```typescript
// Multi-purpose SQLite storage
export class SQLiteKVStorage implements KVStorage { /* ... */ }
export class SQLiteGraphStorage implements GraphStorage { /* ... */ }
export class SQLiteVectorStorage implements VectorStorage { /* ... */ } // Future

// Unified provider
export class SQLiteProvider {
  constructor(options: { path: string });
  
  getKVStorage(): KVStorage;
  getGraphStorage(): GraphStorage;
  getVectorStorage(): VectorStorage; // Future
}
```

**`@flowrag/storage-json`** (unchanged):
- Remains file-based KV storage only
- Lightweight, Git-friendly

**`@flowrag/storage-lancedb`** (unchanged):
- Remains vector-specialized
- High-performance vector operations

### 2.2 Breaking Changes

#### Package Renames
- `@flowrag/embedder-gemini` → `@flowrag/provider-gemini`
- `@flowrag/embedder-local` → `@flowrag/provider-local`  
- `@flowrag/llm-gemini` → **merged into** `@flowrag/provider-gemini`

#### Import Changes
```typescript
// OLD
import { GeminiEmbedder } from '@flowrag/embedder-gemini';
import { GeminiExtractor } from '@flowrag/llm-gemini';

// NEW - Option 1: Individual imports
import { GeminiEmbedder, GeminiExtractor } from '@flowrag/provider-gemini';

// NEW - Option 2: Unified provider
import { GeminiProvider } from '@flowrag/provider-gemini';
const provider = new GeminiProvider({ apiKey: 'xxx' });
```

### 2.3 Backward Compatibility

**Phase 1**: Create new packages alongside old ones
- Publish `@flowrag/provider-gemini` with both unified and individual exports
- Keep `@flowrag/embedder-gemini` and `@flowrag/llm-gemini` as **deprecated**
- Add deprecation warnings

**Phase 2**: Update presets and examples
- Update `@flowrag/presets` to use new packages
- Update documentation and examples

**Phase 3**: Remove old packages (v2.0)
- Remove deprecated packages
- Clean up dependencies

## 3. Benefits

### 3.1 User Experience

**Simpler setup**:
```typescript
// Before: Multiple imports, multiple configs
import { GeminiEmbedder } from '@flowrag/embedder-gemini';
import { GeminiExtractor } from '@flowrag/llm-gemini';

const embedder = new GeminiEmbedder({ apiKey: 'xxx' });
const extractor = new GeminiExtractor({ apiKey: 'xxx' }); // Duplicate config

// After: Single import, shared config
import { GeminiProvider } from '@flowrag/provider-gemini';

const provider = new GeminiProvider({ apiKey: 'xxx' });
// Use provider.embed() and provider.extractEntities()
```

**Fewer dependencies**:
```bash
# Before: Install 2 packages for Gemini
npm install @flowrag/embedder-gemini @flowrag/llm-gemini

# After: Install 1 package
npm install @flowrag/provider-gemini
```

### 3.2 Developer Experience

**Consistent API**:
- All providers implement same interface
- Shared configuration and error handling
- Easier to switch between providers

**Better organization**:
- Related functionality grouped together
- Clear provider boundaries
- Easier to add new providers

## 4. Implementation Steps

### 4.1 Phase 1: Create New Packages

1. **Create `@flowrag/provider-gemini`**:
   - Move `GeminiEmbedder` from `embedder-gemini`
   - Move `GeminiExtractor` from `llm-gemini`
   - Create unified `GeminiProvider` class
   - Export both individual classes and unified provider

2. **Create `@flowrag/provider-local`**:
   - Move `LocalEmbedder` from `embedder-local`
   - Create placeholder for future `LocalExtractor`
   - Create unified `LocalProvider` class

3. **Enhance `@flowrag/storage-sqlite`**:
   - Add `SQLiteKVStorage` implementation
   - Keep existing `SQLiteGraphStorage`
   - Create unified `SQLiteProvider` class

### 4.2 Phase 2: Update Ecosystem

1. **Update `@flowrag/presets`**:
   - Use new provider packages
   - Maintain same API for users

2. **Add deprecation warnings**:
   - Add console warnings to old packages
   - Update documentation with migration guide

3. **Update examples and tests**:
   - Migrate all examples to new structure
   - Ensure 100% test coverage

### 4.3 Phase 3: Cleanup (v2.0)

1. **Remove deprecated packages**:
   - `@flowrag/embedder-gemini`
   - `@flowrag/embedder-local`
   - `@flowrag/llm-gemini`

2. **Update dependencies**:
   - Remove old packages from all dependents
   - Clean up package.json files

## 5. Migration Guide

### 5.1 For Library Users

**Minimal migration** (keep individual imports):
```typescript
// Change imports only
- import { GeminiEmbedder } from '@flowrag/embedder-gemini';
- import { GeminiExtractor } from '@flowrag/llm-gemini';
+ import { GeminiEmbedder, GeminiExtractor } from '@flowrag/provider-gemini';

// Usage stays the same
const embedder = new GeminiEmbedder({ apiKey: 'xxx' });
const extractor = new GeminiExtractor({ apiKey: 'xxx' });
```

**Recommended migration** (use unified provider):
```typescript
- import { GeminiEmbedder } from '@flowrag/embedder-gemini';
- import { GeminiExtractor } from '@flowrag/llm-gemini';
+ import { GeminiProvider } from '@flowrag/provider-gemini';

- const embedder = new GeminiEmbedder({ apiKey: 'xxx' });
- const extractor = new GeminiExtractor({ apiKey: 'xxx' });
+ const provider = new GeminiProvider({ apiKey: 'xxx' });

// Use provider methods directly
- await embedder.embed(text);
+ await provider.embed(text);

- await extractor.extractEntities(content, entities, schema);
+ await provider.extractEntities(content, entities, schema);
```

### 5.2 For Preset Users

**No changes required** - `@flowrag/presets` will be updated internally.

## 6. Timeline

- **v1.1.0**: Create new packages alongside old ones
- **v1.2.0**: Update presets and add deprecation warnings  
- **v2.0.0**: Remove old packages (breaking change)

## 7. Future Providers

This structure makes it easy to add new providers:

- `@flowrag/provider-openai` (GPT embeddings + extraction)
- `@flowrag/provider-anthropic` (Claude extraction)
- `@flowrag/provider-aws` (Bedrock embeddings + extraction)
- `@flowrag/storage-redis` (Redis KV + Vector)
- `@flowrag/storage-opensearch` (OpenSearch Vector + Graph)

---

*Last updated: 2026-01-06*
*Version: 1.1*
