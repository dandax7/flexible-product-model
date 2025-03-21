TEST_ROOT=http://localhost:3000/api

set failed = 0
set passed = 0

curl -s -I ${TEST_ROOT} > /dev/null || { echo "Server is not running"; exit 1; }

echo "🚀 Server is running on $TEST_ROOT"


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

end_test() {
  echo "TALLY"
  echo "Passed: $passed"
  if (( failed > 0 )); then
      echo "Failed: $failed"
      exit 1
  fi
  exit 0
}
