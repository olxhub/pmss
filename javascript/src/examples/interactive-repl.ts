#!/usr/bin/env node
/**
 * Interactive REPL for querying PMSS configurations
 *
 * Usage: interactive-repl.ts <pmss-file>
 * Commands:
 *   set <key> <value>          Set context field
 *   remove <key>               Remove context field
 *   query                      Query all values with current context
 *   query <key>                Query specific key
 *   context                    Show current context
 *   help                       Show this help
 *   exit                       Exit the REPL
 */

import { loadPMSSFile, css_selector_key, Selector, SelectorMatchContext } from '../index.js';
import * as readline from 'readline';
import path from 'path';

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: interactive-repl.ts <pmss-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(configPath);
  console.log(`Loading PMSS config from: ${fullPath}\n`);

  let rules: Map<string, Map<Selector, string>>;
  try {
    rules = await loadPMSSFile(fullPath);
  } catch (err) {
    console.error('Error loading PMSS file:', (err as Error).message);
    process.exit(1);
  }

  const context: SelectorMatchContext = {};

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const prompt = () => {
    rl.question('pmss> ', line => {
      processCommand(line.trim());
    });
  };

  function showHelp() {
    console.log(`
Context Commands:
  set <key> <value>     Set context field (e.g., "set types database")
  remove <key>          Remove context field
  array <key> <val>     Add value to array field (e.g., "array classes production")
  context               Show current context

Query Commands:
  query                 Query all configuration values with current context
  query <key>           Query specific configuration key with current context

Other:
  help                  Show this help
  debug [key]           Debug selector matching for a key (default: hw_deadline)
  exit                  Exit the REPL

Examples:
  pmss> array classes extended
  pmss> query hw_deadline
  pmss> query
    `);
  }

  function processCommand(line: string) {
    if (!line) {
      prompt();
      return;
    }

    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'exit':
        console.log('Goodbye!');
        rl.close();
        return;

      case 'help':
        showHelp();
        break;

      case 'context':
        console.log('Current context:', JSON.stringify(context, null, 2));
        break;

      case 'debug': {
        const queryKey = parts[1] || 'hw_deadline';
        const selectorMap = rules.get(queryKey);
        if (!selectorMap) {
          console.log(`Key not found: ${queryKey}`);
        } else {
          console.log(`\nDebug for ${queryKey}:`);
          console.log(`Total selectors: ${selectorMap.size}`);
          for (const [selector, value] of selectorMap.entries()) {
            const matches = selector.match(context);
            const spec = (selector as any).css_specificity?.();
            console.log(`  ${selector.toString()} (spec=${spec}) => ${value} [${matches ? 'MATCH' : 'no match'}]`);
          }
        }
        break;
      }

      case 'set': {
        if (parts.length < 3) {
          console.log('Usage: set <key> <value>');
          break;
        }
        const key = parts[1];
        const value = parts.slice(2).join(' ');
        // For array fields, always use array format
        if (key === 'types' || key === 'classes') {
          (context as any)[key] = [value];
        } else {
          (context as any)[key] = value;
        }
        console.log(`Set ${key} = ${value}`);
        break;
      }

      case 'remove': {
        if (parts.length < 2) {
          console.log('Usage: remove <key>');
          break;
        }
        const key = parts[1];
        delete (context as any)[key];
        console.log(`Removed ${key}`);
        break;
      }

      case 'array': {
        if (parts.length < 3) {
          console.log('Usage: array <key> <value>');
          break;
        }
        const key = parts[1];
        const value = parts.slice(2).join(' ');
        if (!(context as any)[key]) {
          (context as any)[key] = [];
        } else if (!Array.isArray((context as any)[key])) {
          (context as any)[key] = [(context as any)[key]];
        }
        ((context as any)[key] as any[]).push(value);
        console.log(`Added ${value} to ${key}`);
        break;
      }

      case 'query': {
        const queryKey = parts[1];
        if (queryKey) {
          // Query specific key
          const selectorMap = rules.get(queryKey);
          if (!selectorMap) {
            console.log(`Key not found: ${queryKey}`);
          } else {
            const matches = [...selectorMap.entries()]
              .filter(([selector]) => selector.match(context))
              .sort((a, b) => (a[0] as any).css_specificity() - (b[0] as any).css_specificity());

            if (matches.length === 0) {
              console.log(`  ${queryKey}: (no match)`);
            } else {
              const [selector, value] = matches[matches.length - 1];
              console.log(`  ${queryKey}: ${value} (via ${selector.toString()})`);
              // Debug: show all matches
              if (matches.length > 1) {
                console.log(`    (${matches.length} total matches)`);
              }
            }
          }
        } else {
          // Query all keys
          console.log('\nResults:');
          const keys = Array.from(rules.keys()).sort();
          for (const key of keys) {
            const selectorMap = rules.get(key);
            if (!selectorMap) continue;

            const matches = [...selectorMap.entries()]
              .filter(([selector]) => selector.match(context))
              .sort((a, b) => (a[0] as any).css_specificity() - (b[0] as any).css_specificity());

            if (matches.length > 0) {
              const [selector, value] = matches[matches.length - 1];
              console.log(`  ${key}: ${value} (via ${selector.toString()})`);
            } else {
              console.log(`  ${key}: (no match)`);
            }
          }
          console.log();
        }
        break;
      }

      default:
        console.log(`Unknown command: ${cmd}`);
        console.log('Type "help" for available commands');
    }

    prompt();
  }

  console.log('PMSS Interactive Query Tool');
  console.log('Type "help" for commands\n');
  prompt();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
