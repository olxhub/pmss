#!/usr/bin/env node
/**
 * Quick parser for PMSS files - useful for testing the grammar
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '../pmssParser.js';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: parse-pmss.ts <file>');
    process.exit(1);
  }

  try {
    const content = await fs.readFile(path.resolve(file), 'utf-8');
    const parsed = parse(content, {});
    console.log(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('Failed to parse', file);
    console.error((err as Error).message);
    process.exit(1);
  }
}

main();
