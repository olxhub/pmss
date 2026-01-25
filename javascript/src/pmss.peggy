/**
 * PMSS (Preference Management Style Sheets) Grammar
 *
 * CSS-inspired configuration format with hierarchical selectors and properties
 *
 * Example:
 * * {
 *     hostname: localhost;
 * }
 *
 * [environment=production] {
 *     hostname: api.example.com;
 * }
 */

stylesheet = _ block* _

block = selector _ "{" _ declarations? _ "}"

selector = _ parts:(simpleSelector)+ _

simpleSelector = _
  part:(
    universalSelector
    / classSelector
    / attributeSelector
    / pseudoClassSelector
    / pseudoElementSelector
    / typeSelector
  ) _
  { return part; }

universalSelector = "*"

classSelector = "." name:identifier

typeSelector = !(["." "[" ":" "{" "}"]) name:identifier

attributeSelector =
  "[" _ name:identifier _ "]"
  / "[" _ name:identifier _ "=" _ value:stringLiteral _ "]"

pseudoClassSelector = ":" name:identifier

pseudoElementSelector = "::" name:identifier

declarations = first:declaration rest:(declaration)*

declaration = key:identifier _ ":" _ value:declValue _ ";"

declValue = $(!";" !"\n" .)+

identifier = $[a-zA-Z0-9_-]+

stringLiteral = "\"" value:$([^"\\] / "\\" .)* "\""
  { return value; }

_ = [ \t\r\n]*
