/**
 * Simple PMSS file loader
 *
 * Parses PMSS files into rule structures.
 * This is a hand-written parser for now; will be replaced by Peggy-generated parser.
 */

import { readFileSync } from 'fs';
import {
  Selector,
  UniversalSelector,
  TypeSelector,
  ClassSelector,
  CompoundSelector,
} from './selectors.js';

export async function loadPMSSFile(filepath: string): Promise<Map<string, Map<Selector, string>>> {
  const text = readFileSync(filepath, 'utf-8');
  return parsePMSS(text);
}

function parsePMSS(text: string): Map<string, Map<Selector, string>> {
  const rules = new Map<string, Map<Selector, string>>();

  // Remove comments
  const cleaned = removeComments(text);
  const lines = cleaned.split('\n');

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip empty lines
    if (trimmed === '') {
      i++;
      continue;
    }

    // Look for selector followed by block
    const blockMatch = trimmed.match(/^(.+?)\s*\{\s*$/);
    if (blockMatch) {
      const selectorStr = blockMatch[1].trim();
      const selector = parseSelector(selectorStr);
      i++;

      // Parse the block until we hit }
      while (i < lines.length) {
        const blockLine = lines[i].trim();

        if (blockLine === '}') {
          i++;
          break;
        }

        if (blockLine === '') {
          i++;
          continue;
        }

        // Parse key: value;
        const propMatch = blockLine.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+?)\s*;?$/);
        if (propMatch) {
          const key = propMatch[1];
          const value = propMatch[2].trim();

          if (!rules.has(key)) {
            rules.set(key, new Map());
          }

          rules.get(key)!.set(selector, value);
        }

        i++;
      }
    } else {
      i++;
    }
  }

  return rules;
}

function removeComments(text: string): string {
  // Remove block comments /* ... */
  let result = text.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');
  // Remove line comments // ...
  result = result.replace(/\/\/.*/g, '');
  return result;
}

function parseSelector(selectorStr: string): Selector {
  const parts = selectorStr.trim().split(/\s+/);
  const selectors: Selector[] = [];

  for (const part of parts) {
    if (part === '*') {
      selectors.push(new UniversalSelector());
    } else if (part.startsWith('.')) {
      selectors.push(new ClassSelector(part.substring(1)));
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
      selectors.push(new TypeSelector(part));
    }
  }

  if (selectors.length === 0) {
    return new UniversalSelector();
  } else if (selectors.length === 1) {
    return selectors[0];
  } else {
    return new CompoundSelector(selectors);
  }
}
