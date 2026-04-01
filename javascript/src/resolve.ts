/**
 * PMSS rule resolution — given parsed rules, a property name, and a context,
 * return the value from the highest-specificity matching selector.
 */

import { Selector, css_selector_key, type SelectorMatchContext } from './selectors.js';

/**
 * Resolve a configuration value from parsed PMSS rules.
 *
 * @param rules - Parsed rules: Map from property name to Map of (Selector → value)
 * @param key - The property name to look up
 * @param context - Selector match context (types, classes, attributes, id)
 * @returns The value from the highest-specificity matching rule, or null if no match
 */
export function resolve(
  rules: Map<string, Map<Selector, string>>,
  key: string,
  context: SelectorMatchContext
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
