/**
 * PMSS - Preference Management Style Sheets
 *
 * TypeScript/JavaScript implementation of cascading configuration system
 */

// Selectors
export {
  Selector,
  UniversalSelector,
  TypeSelector,
  ClassSelector,
  AttributeSelector,
  IDSelector,
  CompoundSelector,
  css_selector_key,
  type SelectorMatchContext,
} from './selectors.js';

// Types
export { type Rule, type RuleSheet, type TestResult, type BlockTestResult } from './types.js';

// Parsers
export { QueriesParserAdapter as QueriesParser, loadQueriesFile, type QueryBlock } from './queriesParserAdapter.js';
export { loadPMSSFile } from './pmssLoader.js';

// Test runner
export { PMSSTestRunner } from './testRunner.js';
