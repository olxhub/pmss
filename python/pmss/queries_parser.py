"""
Parser for .pmss.queries test files

Format:
  # Optional comments
  - context-key: value
  - another: value

  >>> query-key
  answer-value

  >>> another-query
  another-answer
"""

import re
from typing import List, Dict, Any, Tuple


class QueryBlock:
    """A single test block with context and expected query results"""

    def __init__(self, context: Dict[str, str], queries: Dict[str, str], comments: List[str] = None):
        self.context = context
        self.queries = queries
        self.comments = comments or []

    def __repr__(self):
        return f"QueryBlock(context={self.context}, queries={self.queries})"


class QueriesParser:
    """Parse .pmss.queries files"""

    def __init__(self, text: str):
        self.text = text
        self.lines = text.split('\n')
        self.pos = 0

    def parse(self) -> List[QueryBlock]:
        """Parse entire file into list of QueryBlocks"""
        blocks = []

        while self.pos < len(self.lines):
            # Skip blank lines
            if self._consume_blank_lines():
                continue

            # End of file
            if self.pos >= len(self.lines):
                break

            block = self._parse_block()
            if block:
                blocks.append(block)

        return blocks

    def _consume_blank_lines(self) -> bool:
        """Skip over blank lines and whitespace. Return True if any consumed."""
        start = self.pos
        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            if line.strip() == "":
                self.pos += 1
            else:
                break
        return self.pos > start

    def _parse_block(self) -> QueryBlock:
        """Parse a single test block"""
        comments = self._parse_comments()
        context = self._parse_context()

        if not context:
            # No context means not a valid block
            return None

        queries = self._parse_queries()

        return QueryBlock(context=context, queries=queries, comments=comments)

    def _parse_comments(self) -> List[str]:
        """Parse optional comment lines (starting with #)"""
        comments = []

        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            stripped = line.strip()

            if stripped.startswith("#"):
                comments.append(stripped[1:].strip())
                self.pos += 1
            elif stripped == "":
                self.pos += 1
            else:
                break

        return comments

    def _parse_context(self) -> Dict[str, any]:
        """Parse context lines (starting with -)

        Repeated keys are stored as lists. For example:
        - classes: foo
        - classes: bar
        becomes: {'classes': ['foo', 'bar']}
        """
        context = {}

        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            stripped = line.strip()

            # Skip blank lines
            if stripped == "":
                self.pos += 1
                continue

            # If this line doesn't start with "-", we're done with context
            if not stripped.startswith("-"):
                # If we've already seen context, that's OK - we're moving to queries
                # If we haven't seen any context, that's end of block
                break

            # Parse "- key: value"
            match = re.match(r'^\s*-\s*([a-zA-Z0-9_-]+)\s*:\s*(.+)$', line)
            if match:
                key = match.group(1)
                value = match.group(2).strip()

                # Handle repeated keys as lists
                if key in context:
                    # Convert to list if not already
                    if not isinstance(context[key], list):
                        context[key] = [context[key]]
                    context[key].append(value)
                else:
                    context[key] = value

                self.pos += 1
            else:
                # Malformed context line
                break

        return context

    def _parse_queries(self) -> Dict[str, str]:
        """Parse query blocks (>>> key followed by answer)"""
        queries = {}

        while self.pos < len(self.lines):
            line = self.lines[self.pos]
            stripped = line.strip()

            if stripped == "":
                self.pos += 1
                continue

            if not stripped.startswith(">>>"):
                break

            # Parse ">>> key"
            match = re.match(r'^\s*>>>\s*([a-zA-Z0-9_-]+)\s*$', line)
            if match:
                key = match.group(1)
                self.pos += 1

                # Next non-blank line is the answer
                while self.pos < len(self.lines):
                    answer_line = self.lines[self.pos]
                    if answer_line.strip() == "":
                        self.pos += 1
                        continue

                    # Check if it's another query or end of block
                    if answer_line.strip().startswith(">>>") or answer_line.strip().startswith("-") or answer_line.strip().startswith("#"):
                        break

                    queries[key] = answer_line.strip()
                    self.pos += 1
                    break
            else:
                break

        return queries


def load_queries_file(filepath: str) -> List[QueryBlock]:
    """Load and parse a .pmss.queries file"""
    with open(filepath, 'r') as f:
        text = f.read()

    parser = QueriesParser(text)
    return parser.parse()


if __name__ == '__main__':
    # Test the parser
    import sys
    if len(sys.argv) > 1:
        blocks = load_queries_file(sys.argv[1])
        for i, block in enumerate(blocks):
            print(f"\nBlock {i}:")
            if block.comments:
                print(f"  Comments: {block.comments}")
            print(f"  Context: {block.context}")
            print(f"  Queries: {block.queries}")
