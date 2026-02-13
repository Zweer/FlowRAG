import type { ExtractedEntity, ExtractedRelation, ExtractionResult } from '@flowrag/core';
import type { ExtractionContext } from '@flowrag/pipeline';
import { checkbox, input, select } from '@inquirer/prompts';

export async function reviewExtraction(
  extraction: ExtractionResult,
  context: ExtractionContext,
): Promise<ExtractionResult> {
  console.log(`\n📄 Chunk ${context.chunkId} — ${context.documentId}`);

  const entities = await reviewEntities(extraction.entities, context.content);
  const keptNames = new Set(entities.map((e) => e.name));

  // Auto-filter relations referencing removed entities
  const validRelations = extraction.relations.filter(
    (r) => keptNames.has(r.source) && keptNames.has(r.target),
  );
  const relations = await reviewRelations(validRelations, context.content);

  return { entities, relations };
}

async function reviewEntities(
  entities: ExtractedEntity[],
  content: string,
): Promise<ExtractedEntity[]> {
  if (entities.length === 0) {
    console.log('  No entities extracted.');
    return [];
  }

  let result = await checkbox({
    message: 'Entities — select to keep:',
    choices: entities.map((e) => ({
      value: e,
      name: `[${e.type}] ${e.name} — "${e.description}"`,
      checked: true,
    })),
  });

  for (;;) {
    const action = await entityMenu();
    if (action === 'continue') break;
    if (action === 'show') showContent(content);
    if (action === 'edit') result = await editEntity(result);
    if (action === 'add') result.push(await addEntity());
  }

  return result;
}

async function reviewRelations(
  relations: ExtractedRelation[],
  content: string,
): Promise<ExtractedRelation[]> {
  if (relations.length === 0) {
    console.log('  No relations to review.');
    return [];
  }

  let result = await checkbox({
    message: 'Relations — select to keep:',
    choices: relations.map((r) => ({
      value: r,
      name: `${r.source} --${r.type}--> ${r.target} — "${r.description}"`,
      checked: true,
    })),
  });

  for (;;) {
    const action = await relationMenu();
    if (action === 'done') break;
    if (action === 'show') showContent(content);
    if (action === 'edit') result = await editRelation(result);
    if (action === 'add') result.push(await addRelation());
  }

  return result;
}

function entityMenu(): Promise<string> {
  return select({
    message: 'What next?',
    choices: [
      { value: 'continue', name: '→ Continue to relations' },
      { value: 'edit', name: '✏️  Edit an entity' },
      { value: 'add', name: '➕ Add new entity' },
      { value: 'show', name: '📄 Show chunk content' },
    ],
  });
}

function relationMenu(): Promise<string> {
  return select({
    message: 'What next?',
    choices: [
      { value: 'done', name: '✅ Done' },
      { value: 'edit', name: '✏️  Edit a relation' },
      { value: 'add', name: '➕ Add new relation' },
      { value: 'show', name: '📄 Show chunk content' },
    ],
  });
}

function showContent(content: string): void {
  console.log(`\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`);
  console.log(content);
  console.log(`┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`);
}

async function editEntity(entities: ExtractedEntity[]): Promise<ExtractedEntity[]> {
  const entity = await select({
    message: 'Which entity?',
    choices: entities.map((e, i) => ({
      value: i,
      name: `[${e.type}] ${e.name}`,
    })),
  });

  const e = entities[entity];
  e.name = await input({ message: 'Name:', default: e.name });
  e.type = await input({ message: 'Type:', default: e.type });
  e.description = await input({ message: 'Description:', default: e.description });

  return entities;
}

async function addEntity(): Promise<ExtractedEntity> {
  return {
    name: await input({ message: 'Name:' }),
    type: await input({ message: 'Type:' }),
    description: await input({ message: 'Description:' }),
  };
}

async function editRelation(relations: ExtractedRelation[]): Promise<ExtractedRelation[]> {
  const idx = await select({
    message: 'Which relation?',
    choices: relations.map((r, i) => ({
      value: i,
      name: `${r.source} --${r.type}--> ${r.target}`,
    })),
  });

  const r = relations[idx];
  r.source = await input({ message: 'Source:', default: r.source });
  r.target = await input({ message: 'Target:', default: r.target });
  r.type = await input({ message: 'Type:', default: r.type });
  r.description = await input({ message: 'Description:', default: r.description });
  const kw = await input({
    message: 'Keywords (comma-separated):',
    default: r.keywords.join(', '),
  });
  r.keywords = kw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  return relations;
}

async function addRelation(): Promise<ExtractedRelation> {
  const kw = await input({ message: 'Keywords (comma-separated):' });
  return {
    source: await input({ message: 'Source:' }),
    target: await input({ message: 'Target:' }),
    type: await input({ message: 'Type:' }),
    description: await input({ message: 'Description:' }),
    keywords: kw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  };
}
