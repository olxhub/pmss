/**
 * PMSS (Preference Management Style Sheets) Grammar
 *
 * CSS-inspired configuration format with hierarchical selectors and properties
 *
 * Semantic actions build structured output directly instead of raw parse trees
 */

stylesheet = __ blocks:block* __
  { return blocks; }

block = selector:selector __ "{" __ declarations:declarations? __ "}"
  {
    return {
      selector: selector,
      declarations: declarations || []
    };
  }

selector = __ parts:(simpleSelector)+ __
  { return { parts: parts }; }

simpleSelector = __
  part:(
    universalSelector
    / classSelector
    / attributeSelector
    / pseudoClassSelector
    / pseudoElementSelector
    / typeSelector
  ) __
  { return part; }

universalSelector = "*"
  { return { type: 'universal' }; }

classSelector = "." name:identifier
  { return { type: 'class', name: name }; }

typeSelector = !(["." "[" ":" "{" "}"]) name:identifier
  { return { type: 'type', name: name }; }

attributeSelector =
  "[" __ name:identifier __ "]"
    { return { type: 'attribute', name: name, operator: null, value: null }; }
  / "[" __ name:identifier __ "=" __ value:stringLiteral __ "]"
    { return { type: 'attribute', name: name, operator: '=', value: value }; }

pseudoClassSelector = ":" name:identifier
  { return { type: 'pseudo-class', name: name }; }

pseudoElementSelector = "::" name:identifier
  { return { type: 'pseudo-element', name: name }; }

declarations = __ first:declaration rest:(__ declaration)*
  { return [first, ...rest.map(r => r[1])]; }

declaration = key:identifier __ ":" __ value:declValue __ ";"
  { return { key: key, value: value.trim() }; }

declValue = $(!";" !"\n" .)+

identifier = $[a-zA-Z0-9_-]+

stringLiteral = "\"" value:$([^"\\] / "\\" .)* "\""
  { return value; }

// Whitespace with comments
__ = ([ \t\r\n] / comment)*

// Single-line and block comments
comment = "//" (!"\n" .)* "\n"
        / "/*" (!"*/" .)* "*/"

// Just whitespace (no comments)
_ = [ \t\r\n]*
