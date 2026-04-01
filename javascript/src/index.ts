/**
 * PMSS - Preference Management Style Sheets
 *
 * TypeScript/JavaScript implementation of cascading configuration system.
 *
 * This entry point is browser-safe (no fs dependency).
 * For Node.js file-loading helpers, import from 'pmss/node'.
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

// Resolution
export { resolve } from './resolve.js';

// Types
export { type Rule, type RuleSheet, type TestResult, type BlockTestResult } from './types.js';

// Parsers (browser-safe: parse from string, no fs)
export { QueriesParserAdapter as QueriesParser, type QueryBlock } from './queriesParserAdapter.js';
export { PMSSParserAdapter } from './pmssParserAdapter.js';
