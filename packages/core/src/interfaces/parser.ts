/** Parsed document output from a DocumentParser */
export interface ParsedDocument {
  content: string;
  metadata: Record<string, unknown>;
}

/** Pluggable file parser for non-text documents (PDF, DOCX, images, etc.) */
export interface DocumentParser {
  readonly supportedExtensions: string[];
  parse(filePath: string): Promise<ParsedDocument>;
}
