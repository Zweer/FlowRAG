import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ExtractionResult, LLMExtractor, Schema } from '@flowrag/core';

import { BedrockLLMModels } from './models.js';

export interface BedrockExtractorOptions {
  model?: string;
  temperature?: number;
  region?: string;
}

export class BedrockExtractor implements LLMExtractor {
  readonly modelName: string;
  private readonly client: BedrockRuntimeClient;
  private readonly temperature: number;

  constructor(options: BedrockExtractorOptions = {}) {
    this.modelName = options.model ?? BedrockLLMModels.CLAUDE_HAIKU_4_5;
    this.temperature = options.temperature ?? 0.1;
    this.client = new BedrockRuntimeClient({
      region: options.region ?? process.env.AWS_REGION ?? 'us-east-1',
    });
  }

  async extractEntities(
    content: string,
    knownEntities: string[],
    schema: Schema,
  ): Promise<ExtractionResult> {
    const prompt = this.buildPrompt(content, knownEntities, schema);

    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.modelName,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { temperature: this.temperature },
      }),
    );

    const text = response.output?.message?.content?.[0]?.text ?? '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  private buildPrompt(content: string, knownEntities: string[], schema: Schema): string {
    const entityTypes = schema.entityTypes.join(', ');
    const relationTypes = schema.relationTypes.join(', ');
    const knownEntitiesList =
      knownEntities.length > 0
        ? `\n\nKnown entities to reference: ${knownEntities.join(', ')}`
        : '';

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
}
