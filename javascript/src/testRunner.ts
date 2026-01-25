/**
 * Test runner for PMSS configuration files
 *
 * Loads .pmss.queries files and validates against .pmss files
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { loadQueriesFile, QueryBlock } from './queriesParserAdapter.js';
import { BlockTestResult, TestResult } from './types.js';
import { Selector, css_selector_key, SelectorMatchContext } from './selectors.js';
import { loadPMSSFile } from './pmssLoader.js';

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
        blocks = await loadQueriesFile(queriesFile);
        console.log(`  ✓ Loaded ${blocks.length} test blocks`);
      } catch (e) {
        console.log(`ERROR: Failed to parse ${queriesFile}: ${e}`);
        continue;
      }

      try {
        console.log(`  Parsing PMSS file...`);
        rules = await loadPMSSFile(pmssFile);
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
        const actualValue = this.queryRules(query.key, context, rules);
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

    for (const [key, value] of Object.entries(context)) {
      if (key === 'id') {
        matchContext.id = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
      } else if (key === 'classes') {
        matchContext.classes = Array.isArray(value) ? value : (value ? [value as string] : []);
      } else if (key === 'types') {
        matchContext.types = Array.isArray(value) ? value : (value ? [value as string] : []);
      } else if (key === 'attributes') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          matchContext.attributes = value;
        }
      }
    }

    return matchContext;
  }

  private queryRules(
    key: string,
    context: SelectorMatchContext,
    rules: Map<string, Map<Selector, string>>
  ): string | null {
    const selectorMap = rules.get(key);
    if (!selectorMap) {
      return null;
    }

    const matches: [Selector, string][] = [];

    for (const [selector, value] of selectorMap.entries()) {
      if (selector.match(context)) {
        matches.push([selector, value]);
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by specificity (highest first) and take the best match
    matches.sort((a, b) => css_selector_key(a[0]) - css_selector_key(b[0]));

    return matches[0][1];
  }
}

async function main() {
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
