"""
Test runner for PMSS configuration files.

Loads .pmss.queries files and validates against .pmss configuration files.
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

import pmss.queries_parser as qp
import pmss.loadfile
import pmss.settings
import pmss.schema


class TestResult:
    """Result of a single query test"""

    def __init__(self, query_key: str, context: dict, expected: str, actual: str, passed: bool, error: str = None):
        self.query_key = query_key
        self.context = context
        self.expected = expected
        self.actual = actual
        self.passed = passed
        self.error = error

    def __repr__(self):
        status = "✓ PASS" if self.passed else "✗ FAIL"
        return f"{status}: {self.query_key} with {self.context}"


class BlockTestResult:
    """Result of testing a single block"""

    def __init__(self, block_num: int, comments: List[str], results: List[TestResult]):
        self.block_num = block_num
        self.comments = comments
        self.results = results

    @property
    def passed(self):
        return all(r.passed for r in self.results)

    @property
    def summary(self):
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        return f"Block {self.block_num}: {passed}/{total} passed"


class PMSSTestRunner:
    """Run PMSS query tests"""

    def __init__(self, fixtures_dir: str = "fixtures"):
        self.fixtures_dir = Path(fixtures_dir)
        if not self.fixtures_dir.exists():
            raise FileNotFoundError(f"Fixtures directory not found: {fixtures_dir}")

    def find_test_files(self) -> List[Tuple[Path, Path]]:
        """Find all .pmss and corresponding .pmss.queries files"""
        test_files = []
        for queries_file in self.fixtures_dir.glob("*.pmss.queries"):
            pmss_file = queries_file.with_suffix("")  # Remove .queries
            if pmss_file.exists():
                test_files.append((pmss_file, queries_file))
        return sorted(test_files)

    def run_all_tests(self) -> Tuple[List[BlockTestResult], int, int]:
        """Run all tests and return results"""
        print("Finding test files...")
        test_files = self.find_test_files()
        print(f"Found {len(test_files)} test files\n")

        all_results = []
        total_passed = 0
        total_failed = 0

        for pmss_file, queries_file in test_files:
            print(f"\n{'=' * 60}")
            print(f"Testing: {pmss_file.name}")
            print(f"{'=' * 60}")

            print(f"  Parsing queries file...")
            try:
                blocks = qp.load_queries_file(str(queries_file))
                print(f"  ✓ Loaded {len(blocks)} test blocks")
            except Exception as e:
                print(f"ERROR: Failed to parse {queries_file.name}: {e}")
                continue

            print(f"  Parsing PMSS file (PLY initialization may be slow)...")
            try:
                rules = pmss.loadfile.load_pmss_file(str(pmss_file), provenance="test")
                print(f"  ✓ Loaded configuration rules")
            except Exception as e:
                print(f"ERROR: Failed to parse {pmss_file.name}: {e}")
                continue

            for block_num, block in enumerate(blocks):
                block_results = self._run_block_tests(block, rules)
                all_results.append(block_results)

                # Print results
                print(f"\n{block_results.summary}")
                if block_results.comments:
                    print(f"  Description: {' '.join(block_results.comments)}")

                for result in block_results.results:
                    print(f"  {result}")
                    if result.error:
                        print(f"    Error: {result.error}")

                if block_results.passed:
                    total_passed += len(block_results.results)
                else:
                    total_failed += sum(1 for r in block_results.results if not r.passed)

        return all_results, total_passed, total_failed

    def _run_block_tests(self, block: qp.QueryBlock, rules: dict) -> BlockTestResult:
        """Run all queries in a block and return results"""
        results = []

        # Create a FileRuleset-like wrapper for the loaded rules
        ruleset = self._create_ruleset_from_rules(rules)

        # Convert context dict to selector-matching format
        # Handle special keys like 'classes' and 'types' that should be lists
        selector_context = self._convert_context_for_matching(block.context)

        for query_key, expected_value in block.queries.items():
            try:
                # Query using the ruleset matching logic
                actual_value = self._query_ruleset(query_key, selector_context, ruleset)

                # Normalize values for comparison
                expected_normalized = str(expected_value).strip()
                actual_normalized = str(actual_value).strip() if actual_value is not None else ""

                passed = expected_normalized == actual_normalized

                result = TestResult(
                    query_key=query_key,
                    context=block.context,
                    expected=expected_normalized,
                    actual=actual_normalized,
                    passed=passed,
                )
            except Exception as e:
                result = TestResult(
                    query_key=query_key,
                    context=block.context,
                    expected=expected_value,
                    actual=None,
                    passed=False,
                    error=str(e),
                )

            results.append(result)

        return BlockTestResult(block_num=len(results), comments=block.comments, results=results)

    def _convert_context_for_matching(self, context: dict) -> dict:
        """
        Convert test context dict to selector matching format.

        Test context might have:
        - classes: israel (single value)
        - classes: [israel, student] (already a list from repeated keys)

        Selector matching expects:
        - classes: ['israel', 'student']
        - types: ['course']
        """
        match_context = {}
        attributes = {}

        def _parse_attribute_entry(entry: str):
            if not isinstance(entry, str):
                return
            entries = [segment.strip() for segment in entry.split(",") if segment.strip()]
            for segment in entries:
                if "=" in segment:
                    key, value = segment.split("=", 1)
                    attributes[key.strip()] = value.strip()
                else:
                    attributes[segment.strip()] = None

        for key, value in context.items():
            if key == "id":
                match_context[key] = value[0] if isinstance(value, list) and value else value
            elif key in ('classes', 'types'):
                # Ensure it's a list
                if isinstance(value, list):
                    match_context[key] = value
                else:
                    match_context[key] = [value] if value else []
            elif key == "attributes":
                values = value if isinstance(value, list) else [value]
                for entry in values:
                    _parse_attribute_entry(entry)
            else:
                # Keep other values as-is (for attributes dict)
                match_context[key] = value

        if attributes:
            match_context['attributes'] = attributes

        return match_context

    def _create_ruleset_from_rules(self, rules: dict):
        """Wrap the loaded rules in a simple object that mimics ruleset interface"""
        class RulesWrapper:
            def __init__(self, rules_dict):
                self.rules = rules_dict

            def query(self, key, context):
                """Find all matching selectors for a key in a context"""
                if key not in self.rules:
                    return []

                selector_dict = self.rules[key]
                matches = []

                for selector, value in selector_dict.items():
                    # Check if selector matches the context (using selector's match method)
                    try:
                        if selector.match(
                            id=context.get("id"),
                            types=context.get("types", []),
                            classes=context.get("classes", []),
                            attributes=context.get("attributes", {}),
                        ):
                            matches.append([selector, value])
                    except Exception:
                        pass

                return matches

        return RulesWrapper(rules)

    def _query_ruleset(self, key: str, context: dict, ruleset) -> str:
        """
        Query the ruleset with context and return the best matching value.
        Uses CSS specificity to determine which selector wins.
        """
        import pmss.pmssselectors

        matches = ruleset.query(key, context)

        if not matches:
            return None

        # Sort by specificity (highest first) and take the best match
        matches_sorted = sorted(
            matches,
            key=lambda x: pmss.pmssselectors.css_selector_key(x[0])
        )

        return matches_sorted[0][1]


def main():
    """Run all tests"""
    runner = PMSSTestRunner()
    results, passed, failed = runner.run_all_tests()

    print(f"\n{'=' * 60}")
    print(f"SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total blocks: {len(results)}")
    print(f"Queries passed: {passed}")
    print(f"Queries failed: {failed}")

    if failed == 0:
        print("\n✓ ALL TESTS PASSED")
        return 0
    else:
        print(f"\n✗ {failed} TESTS FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
