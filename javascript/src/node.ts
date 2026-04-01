/**
 * PMSS Node.js entry point — fs-dependent utilities.
 *
 * Browser-safe core is in index.ts. This module adds file-loading
 * helpers that require Node.js fs.
 */

export * from './index.js';

import { promises as fs } from 'fs';
import { Selector } from './selectors.js';
import { PMSSParserAdapter } from './pmssParserAdapter.js';
import { QueriesParserAdapter, type QueryBlock } from './queriesParserAdapter.js';

export async function loadPMSSFile(
  filepath: string
): Promise<Map<string, Map<Selector, string>>> {
  const content = await fs.readFile(filepath, 'utf-8');
  return PMSSParserAdapter.parse(content);
}

export async function loadQueriesFile(filePath: string): Promise<QueryBlock[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return QueriesParserAdapter.parse(content);
}

export { PMSSTestRunner, runTests } from './testRunner.js';
