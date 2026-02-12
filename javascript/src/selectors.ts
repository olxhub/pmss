/**
 * CSS Selector implementations with specificity calculation
 */

export interface SelectorMatchContext {
  id?: string;
  types?: string[];
  classes?: string[];
  attributes?: Record<string, string>;
}

export abstract class Selector {
  abstract match(context: SelectorMatchContext): boolean;
  abstract css_specificity(): number;
  abstract toString(): string;
}

export class UniversalSelector extends Selector {
  match(_context: SelectorMatchContext): boolean {
    return true;
  }

  css_specificity(): number {
    return 0;
  }

  toString(): string {
    return '*';
  }
}

export class TypeSelector extends Selector {
  constructor(private elementType: string) {
    super();
    if (!elementType) {
      throw new Error('Element type should be a string');
    }
  }

  match(context: SelectorMatchContext): boolean {
    const types = context.types || [];
    return types.includes(this.elementType);
  }

  css_specificity(): number {
    return 1;
  }

  toString(): string {
    return this.elementType;
  }
}

export class ClassSelector extends Selector {
  private className: string;

  constructor(className: string) {
    super();
    if (className.startsWith('.')) {
      className = className.substring(1);
    }
    this.className = className;
  }

  match(context: SelectorMatchContext): boolean {
    const classes = context.classes || [];
    return classes.includes(this.className);
  }

  css_specificity(): number {
    return 10;
  }

  toString(): string {
    return `.${this.className}`;
  }
}

export class AttributeSelector extends Selector {
  constructor(
    private attribute: string,
    private operator: string | null,
    private value: string | null
  ) {
    super();
  }

  match(context: SelectorMatchContext): boolean {
    const attributes = context.attributes || {};
    if (!(this.attribute in attributes)) {
      return false;
    }
    if (this.operator === null) {
      return true;
    }
    if (this.operator !== '=') {
      throw new Error('TODO: Implement non-equality operators in AttributeSelector');
    }
    return this.value === attributes[this.attribute];
  }

  css_specificity(): number {
    return 10;
  }

  toString(): string {
    if (this.operator === null) {
      return `[${this.attribute}]`;
    }
    return `[${this.attribute}${this.operator}${this.value}]`;
  }
}

export class IDSelector extends Selector {
  private idName: string;

  constructor(idName: string) {
    super();
    if (idName.startsWith('#')) {
      idName = idName.substring(1);
    }
    this.idName = idName;
  }

  match(context: SelectorMatchContext): boolean {
    return this.idName === context.id;
  }

  css_specificity(): number {
    return 100;
  }

  toString(): string {
    return `#${this.idName}`;
  }
}

export class CompoundSelector extends Selector {
  constructor(private selectors: Selector[]) {
    super();
  }

  match(context: SelectorMatchContext): boolean {
    return this.selectors.every(s => s.match(context));
  }

  css_specificity(): number {
    return this.selectors.reduce((sum, s) => sum + s.css_specificity(), 0);
  }

  toString(): string {
    return this.selectors.map(s => s.toString()).join(' ');
  }
}

/**
 * CSS selector key for sorting by specificity (higher specificity first)
 * Negated so higher specificity sorts first
 */
export function css_selector_key(selector: Selector): number {
  return -selector.css_specificity();
}
