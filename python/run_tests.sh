#!/bin/bash
# Test runner script

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

echo "Testing PMSS fixtures..."
python3 -m pmss.test_runner
