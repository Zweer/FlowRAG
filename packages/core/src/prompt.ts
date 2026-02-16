import type { Schema } from './schema.js';

/**
 * Build the standard entity extraction prompt used by all LLM providers.
 */
export function buildExtractionPrompt(
  content: string,
  knownEntities: string[],
  schema: Schema,
): string {
  const entityTypes = schema.entityTypes.join(', ');
  const relationTypes = schema.relationTypes.join(', ');
  const knownEntitiesList =
    knownEntities.length > 0 ? `\n\nKnown entities to reference: ${knownEntities.join(', ')}` : '';

  const entityFieldsDef =
    Object.keys(schema.entityFields).length > 0
      ? `\n\nEntity custom fields: ${JSON.stringify(schema.entityFields)}`
      : '';
  const relationFieldsDef =
    Object.keys(schema.relationFields).length > 0
      ? `\n\nRelation custom fields: ${JSON.stringify(schema.relationFields)}`
      : '';

  const fieldsInstruction =
    entityFieldsDef || relationFieldsDef
      ? '\nInclude a "fields" object in each entity/relation with the custom field values when applicable.'
      : '';

  return `Extract entities and relations from the following content.

Entity types: ${entityTypes}
Relation types: ${relationTypes}${knownEntitiesList}${entityFieldsDef}${relationFieldsDef}

Content:
${content}

Return a JSON object with this structure:
{
  "entities": [
    {
      "name": "entity name",
      "type": "entity type from the list above, or 'Other' if not matching",
      "description": "brief description of the entity"${entityFieldsDef ? ',\n      "fields": {}' : ''}
    }
  ],
  "relations": [
    {
      "source": "source entity name",
      "target": "target entity name",
      "type": "relation type from the list above",
      "description": "description of the relationship",
      "keywords": ["keyword1", "keyword2"]${relationFieldsDef ? ',\n      "fields": {}' : ''}
    }
  ]
}

Focus on technical entities and their relationships. Be precise and avoid duplicates.${fieldsInstruction}`;
}
