#!/bin/bash

TEST_ROOT=http://localhost:3000/api

set failed = 0
set passed = 0

test_api() {
  local url="$1"
  local verb="$2"
  local data="$3"
  local expected_file="$4"

  # Fetch response from curl
  echo "$verb" "$url" "$data" 

  response=$(curl -s -w "\n%{http_code}\n" -X "$verb" -H "Content-Type: application/json" -d "$data" "$url")

  # Save response to a temp file
  tmp_output=$(mktemp)
  echo "$response" > "$tmp_output"

  # Compare output to expected file
  if diff -q "$tmp_output" "$expected_file" > /dev/null; then
    echo "✅ Passed"
    passed=$((passed+1))
  else
    echo "❌ Failed"
    echo "Differences:"
    diff "$tmp_output" "$expected_file"
    failed=$((failed+1))
  fi

  rm $tmp_output
}

cd "$(dirname "$0")"

curl -I ${TEST_ROOT} || { echo "Server is not running"; exit 1; }

test_api "${TEST_ROOT}/attributes" "GET" "{}" "check_output/test1"
test_api "${TEST_ROOT}/product/M-SW-HOOD" "GET" "{}" "check_output/test2"
test_api "${TEST_ROOT}/sku/M-SW-HOOD-L-B" "GET" "{}" "check_output/test3"
test_api "${TEST_ROOT}/search/sku?size=small&color=gray" "GET" "{}" "check_output/test4"
test_api "${TEST_ROOT}/search/sku?size=small" "GET" "{}" "check_output/test5"

echo "TALLY"
echo "Passed: $passed"
if (( failed > 0 )); then
    echo "Failed: $failed"
    exit 1
fi
exit 0
