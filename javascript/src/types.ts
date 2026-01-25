/**
 * PMSS Rule structure and types
 */

import { Selector } from './selectors.js';

export interface Rule {
  key: string;
  selector: Selector;
  value: string;
}

export interface RuleSheet {
  [key: string]: {
    [selector: string]: string;
  };
}

export interface TestResult {
  queryKey: string;
  context: Record<string, string | string[]>;
  expected: string;
  actual: string | null;
  passed: boolean;
  error?: string;
}

export interface BlockTestResult {
  blockNum: number;
  comments: string[];
  results: TestResult[];
  passed: boolean;
}
