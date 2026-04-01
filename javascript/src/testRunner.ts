/**
 * Test runner for PMSS configuration files
 *
 * Loads .pmss.queries files and validates against .pmss files
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { QueriesParserAdapter, type QueryBlock } from './queriesParserAdapter.js';
import { PMSSParserAdapter } from './pmssParserAdapter.js';
import { BlockTestResult, TestResult } from './types.js';
import { Selector, SelectorMatchContext } from './selectors.js';
import { resolve } from './resolve.js';

export class PMSSTestRunner {
  constructor(private fixturesDir: string = 'fixtures') {}

  findTestFiles(): [string, string][] {
    const files = readdirSync(this.fixturesDir);
    const testFiles: [string, string][] = [];

    for (const file of files) {
      if (file.endsWith('.pmss.queries')) {
        const pmssFile = file.replace('.queries', '');
        const pmssPath = join(this.fixturesDir, pmssFile);
        const queriesPath = join(this.fixturesDir, file);

        try {
          readFileSync(pmssPath, 'utf-8');
          testFiles.push([pmssPath, queriesPath]);
        } catch {
          // .pmss file doesn't exist, skip
        }
      }
    }

    return testFiles.sort();
  }

  async runAllTests(): Promise<[BlockTestResult[], number, number]> {
    const testFiles = this.findTestFiles();
    console.log(`Finding test files...`);
    console.log(`Found ${testFiles.length} test files\n`);

    const allResults: BlockTestResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;

    for (const [pmssFile, queriesFile] of testFiles) {
      console.log(`${'='.repeat(60)}`);
      console.log(`Testing: ${pmssFile.split('/').pop()}`);
      console.log(`${'='.repeat(60)}`);

      let blocks: QueryBlock[];
      let rules: Map<string, Map<Selector, string>>;

      try {
        console.log(`  Parsing queries file...`);
        blocks = QueriesParserAdapter.parse(readFileSync(queriesFile, 'utf-8'));
        console.log(`  ✓ Loaded ${blocks.length} test blocks`);
      } catch (e) {
        console.log(`ERROR: Failed to parse ${queriesFile}: ${e}`);
        continue;
      }

      try {
        console.log(`  Parsing PMSS file...`);
        rules = PMSSParserAdapter.parse(readFileSync(pmssFile, 'utf-8'));
        console.log(`  ✓ Loaded configuration rules`);
      } catch (e) {
        console.log(`ERROR: Failed to parse ${pmssFile}: ${e}`);
        continue;
      }

      for (let i = 0; i < blocks.length; i++) {
        const blockResult = this.runBlockTests(blocks[i], rules);
        allResults.push(blockResult);

        // Print results
        console.log(`\nBlock ${blockResult.blockNum}:`);
        if (blockResult.comments.length > 0) {
          console.log(`  Description: ${blockResult.comments.join(' ')}`);
        }

        for (const result of blockResult.results) {
          const status = result.passed ? '✓ PASS' : '✗ FAIL';
          console.log(`  ${status}: ${result.queryKey} with ${JSON.stringify(result.context)}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        }

        if (blockResult.passed) {
          totalPassed += blockResult.results.length;
        } else {
          totalFailed += blockResult.results.filter(r => !r.passed).length;
        }
      }
    }

    return [allResults, totalPassed, totalFailed];
  }

  private runBlockTests(block: QueryBlock, rules: Map<string, Map<Selector, string>>): BlockTestResult {
    const results: TestResult[] = [];
    const context = this.convertContextForMatching(block.context);

    for (const query of block.queries) {
      try {
        const actualValue = resolve(rules, query.key, context);
        const expectedNormalized = (query.expected || '').trim();
        const actualNormalized = (actualValue || '').trim();
        const passed = expectedNormalized === actualNormalized;

        results.push({
          queryKey: query.key,
          context: block.context,
          expected: expectedNormalized,
          actual: actualNormalized,
          passed,
        });
      } catch (e) {
        results.push({
          queryKey: query.key,
          context: block.context,
          expected: query.expected,
          actual: null,
          passed: false,
          error: String(e),
        });
      }
    }

    return {
      blockNum: results.length,
      comments: block.comments,
      results,
      passed: results.every(r => r.passed),
    };
  }

  private convertContextForMatching(context: Record<string, string | string[]>): SelectorMatchContext {
    const matchContext: SelectorMatchContext = {};
    const attributes: Record<string, string> = {};

    const parseAttributeEntry = (entry: string) => {
      const segments = entry.split(',').map(segment => segment.trim()).filter(Boolean);
      for (const segment of segments) {
        if (segment.includes('=')) {
          const [key, value] = segment.split('=', 2);
          attributes[key.trim()] = value.trim();
        } else {
          attributes[segment.trim()] = '';
        }
      }
    };

    for (const [key, value] of Object.entries(context)) {
      if (key === 'id') {
        matchContext.id = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
      } else if (key === 'classes') {
        matchContext.classes = Array.isArray(value) ? value : (value ? [value as string] : []);
      } else if (key === 'types') {
        matchContext.types = Array.isArray(value) ? value : (value ? [value as string] : []);
      } else if (key === 'attributes') {
        const values = Array.isArray(value) ? value : [value];
        for (const entry of values) {
          parseAttributeEntry(entry);
        }
      }
    }

    if (Object.keys(attributes).length > 0) {
      matchContext.attributes = attributes;
    }

    return matchContext;
  }

}

export async function runTests() {
  // Find fixtures directory - try relative to script location and up
  let fixturesPath = 'fixtures';
  try {
    // Try fixtures in parent directory (when running from javascript/)
    const fs = await import('fs');
    await fs.promises.access('../fixtures');
    fixturesPath = '../fixtures';
  } catch {
    // Fall back to fixtures in current directory
  }

  const runner = new PMSSTestRunner(fixturesPath);
  const [results, passed, failed] = await runner.runAllTests();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total blocks: ${results.length}`);
  console.log(`Queries passed: ${passed}`);
  console.log(`Queries failed: ${failed}`);

  if (failed === 0) {
    console.log(`\n✓ ALL TESTS PASSED`);
    process.exit(0);
  } else {
    console.log(`\n✗ ${failed} TESTS FAILED`);
    process.exit(1);
  }
}

// Run tests if this is the entry point
if (process.argv[1]?.includes('testRunner')) {
  runTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
