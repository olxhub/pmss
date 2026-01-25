#!/bin/bash
# Test runner script

cd "$(dirname "$0")"

echo "Testing PMSS fixtures..."
python3 -m pmss.test_runner
