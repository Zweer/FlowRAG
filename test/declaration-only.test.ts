/**
 * Guard test: ensures declaration-only files contain no runtime logic.
 *
 * These files should only have: imports, exports, type/interface declarations, and comments.
 * If this test fails, you either added logic to a declaration-only file (move it elsewhere)
 * or a new file matching these patterns needs to be refactored.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { glob } from 'tinyglobby';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

/** Patterns matching the coverage exclude in vitest.config.ts */
const DECLARATION_ONLY_GLOBS = [
  'packages/**/src/index.ts',
  'packages/**/src/types.ts',
  'packages/**/src/interfaces/**/*.ts',
];

/** Patterns that indicate runtime logic */
const LOGIC_PATTERNS = [
  /^(export )?(async )?function\s/, // function declarations
  /^(export )?(abstract )?class\s/, // class declarations
  /^(export )?(const|let|var)\s+\w+\s*=/, // variable assignments
  /^if\s*\(/, // conditionals
  /^(for|while|do)\s*[\s(]/, // loops
  /^switch\s*\(/, // switch
  /^return\s/, // return statements
  /^throw\s/, // throw statements
  /^await\s/, // await expressions
];

function containsLogic(source: string): string[] {
  const violations: string[] = [];

  for (const line of source.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines, comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
      continue;

    for (const pattern of LOGIC_PATTERNS) {
      if (pattern.test(trimmed)) {
        violations.push(trimmed);
        break;
      }
    }
  }

  return violations;
}

const files = await glob(DECLARATION_ONLY_GLOBS, { cwd: ROOT, ignore: ['**/node_modules/**'] });

describe('declaration-only files contain no runtime logic', () => {
  for (const file of files.sort()) {
    it(file, async () => {
      const source = await readFile(resolve(ROOT, file), 'utf-8');
      const violations = containsLogic(source);

      expect(violations, `Found runtime logic in ${file}:\n  ${violations.join('\n  ')}`).toEqual(
        [],
      );
    });
  }
});
