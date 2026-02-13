import { describe, expect, it } from 'vitest';

import { program } from '../src/program.js';

describe('program', () => {
  it('should have the correct name and description', () => {
    expect(program.name()).toBe('flowrag');
    expect(program.description()).toBe(
      'FlowRAG CLI - index documents and search with knowledge graph support',
    );
  });

  it('should have version set', () => {
    expect(program.version()).toBe('0.0.0');
  });

  it('should register all commands', () => {
    const commandNames = program.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('index');
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('stats');
  });
});
