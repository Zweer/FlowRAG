// Updates the coverage badge in README.md from coverage/coverage-summary.json (lines %).
// Run from the repository root after `vitest run --coverage` (needs the `json-summary` reporter).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const readmePath = join(cwd(), 'README.md');
const coveragePath = join(cwd(), 'coverage', 'coverage-summary.json');

const colors: { min?: number; color: string }[] = [
  { min: 98, color: 'brightgreen' },
  { min: 95, color: 'green' },
  { min: 90, color: 'yellowgreen' },
  { min: 80, color: 'yellow' },
  { min: 50, color: 'orange' },
  { color: 'red' },
];

const template = (pct: string, color: string): string =>
  `![Coverage Badge](https://img.shields.io/badge/coverage-${pct}%25-${color}?style=flat)`;

const pct = (
  JSON.parse(readFileSync(coveragePath, 'utf8')) as { total?: { lines?: { pct?: unknown } } }
).total?.lines?.pct;
if (typeof pct !== 'number') {
  throw new Error(
    `Invalid coverage file at ${coveragePath}: is the "json-summary" reporter enabled?`,
  );
}

const rounded = Math.round(pct);
const { color } = colors.find(({ min }) => rounded >= (min ?? -Infinity)) as { color: string };
const badge = template(rounded.toString(), color);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const badgeRegex = new RegExp(
  escapeRegex(template('{PERCENTAGE}', '{COLOR}'))
    .replace(escapeRegex('{PERCENTAGE}'), '\\w+')
    .replace(escapeRegex('{COLOR}'), '\\w+'),
);

const readme = readFileSync(readmePath, 'utf8');
if (!badgeRegex.test(readme)) {
  console.warn("README.md doesn't have a coverage badge to update.");
}

writeFileSync(readmePath, readme.replace(badgeRegex, badge));
console.log('Coverage percentage found:', pct);
console.log('Badge added to the readme file');
