/**
 * PMSS Test Queries Grammar
 *
 * Format: Multiple test blocks, each with context and queries
 *
 * Example:
 * # Test description
 * - university: MIT
 * - country: Israel
 *
 * >>> direction
 * RTL
 *
 * >>> instruction-language
 * Hebrew
 *
 * Notes:
 * - Comments are optional, can be multiple lines before context
 * - Context: dash-prefixed lines with key:value
 * - Queries: >>> key on one line, answer on next line
 * - Blank lines allowed between sections
 */

file = block*

block = _ comments context _ queries

comments = comment*

comment = "#" [^\n]* "\n"

context = contextLine+

contextLine = "-" _ key ":" _ value "\n"

queries = query*

query = ">>>" _ key "\n" _ value "\n"

key = [a-zA-Z0-9_:-]+

value = [^\n]+

_ = [ \t\r\n]*
