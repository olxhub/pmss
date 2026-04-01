#!/usr/bin/env node
/**
 * Basic usage example: Load a PMSS file and query values
 */

import { css_selector_key } from '../index.js';
import { loadPMSSFile } from '../node.js';
import path from 'path';

async function main() {
  // Load a PMSS file
  const configPath = process.argv[2] || '../fixtures/simple.pmss';
  const fullPath = path.resolve(configPath);

  console.log(`Loading PMSS config from: ${fullPath}\n`);
  const rules = await loadPMSSFile(fullPath);

  // Example 1: Get all keys available
  console.log('Available configuration keys:');
  const keys = Array.from(rules.keys());
  keys.forEach(key => console.log(`  - ${key}`));
  console.log();

  // Example 2: Query with no context (matches universal selector)
  console.log('Defaults (no context):');
  for (const key of keys) {
    const selectorMap = rules.get(key);
    if (selectorMap) {
      const matches = [...selectorMap.entries()]
        .sort((a, b) => (a[0] as any).css_specificity() - (b[0] as any).css_specificity());
      if (matches.length > 0) {
        console.log(`  ${key}: ${matches[matches.length - 1][1]}`);
      }
    }
  }
  console.log();

  // Example 3: Query with specific context
  console.log('With context { types: ["database"], classes: ["production"] }:');
  const context = { types: ['database'], classes: ['production'] };
  for (const key of keys) {
    const selectorMap = rules.get(key);
    if (selectorMap) {
      const matches = [...selectorMap.entries()]
        .filter(([selector]) => selector.match(context))
        .sort((a, b) => (a[0] as any).css_specificity() - (b[0] as any).css_specificity());
      if (matches.length > 0) {
        console.log(`  ${key}: ${matches[matches.length - 1][1]}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
