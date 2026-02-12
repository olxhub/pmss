/**
 * Adapter wrapper around Peggy-generated PMSS parser
 * Converts structured parse output to Selector/Rule objects
 */

import { parse } from './pmssParser.js';
import {
  Selector,
  UniversalSelector,
  TypeSelector,
  ClassSelector,
  AttributeSelector,
  CompoundSelector,
} from './selectors.js';
import { promises as fs } from 'fs';

interface ParsedBlock {
  selector: { parts: ParsedSelectorPart[] };
  declarations: ParsedDeclaration[];
}

interface ParsedSelectorPart {
  type: string;
  name?: string;
  operator?: string | null;
  value?: string | null;
}

interface ParsedDeclaration {
  key: string;
  value: string;
}

export class PMSSParserAdapter {
  static parse(content: string): Map<string, Map<Selector, string>> {
    const blocks: ParsedBlock[] = parse(content, {});
    return this.processBlocks(blocks);
  }

  private static processBlocks(
    blocks: ParsedBlock[]
  ): Map<string, Map<Selector, string>> {
    const rules = new Map<string, Map<Selector, string>>();

    for (const block of blocks) {
      const selector = this.buildSelector(block.selector.parts);

      for (const decl of block.declarations) {
        if (!rules.has(decl.key)) {
          rules.set(decl.key, new Map());
        }
        rules.get(decl.key)!.set(selector, decl.value);
      }
    }

    return rules;
  }

  private static buildSelector(parts: ParsedSelectorPart[]): Selector {
    const selectors: Selector[] = [];

    for (const part of parts) {
      const selector = this.buildSelectorPart(part);
      if (selector) {
        selectors.push(selector);
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

  private static buildSelectorPart(
    part: ParsedSelectorPart
  ): Selector | null {
    switch (part.type) {
      case 'universal':
        return new UniversalSelector();
      case 'type':
        return part.name ? new TypeSelector(part.name) : null;
      case 'class':
        return part.name ? new ClassSelector(part.name) : null;
      case 'attribute':
        return part.name
          ? new AttributeSelector(part.name, part.operator || null, part.value || null)
          : null;
      default:
        return null;
    }
  }
}

export async function loadPMSSFile(
  filepath: string
): Promise<Map<string, Map<Selector, string>>> {
  const content = await fs.readFile(filepath, 'utf-8');
  return PMSSParserAdapter.parse(content);
}
