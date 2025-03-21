#!/bin/bash

cd "$(dirname "$0")"
. _harness.sh

test_api "${TEST_ROOT}/attributes" "GET" "{}" "check_output/seed_test1"
test_api "${TEST_ROOT}/product/M-SW-HOOD" "GET" "{}" "check_output/seed_test2"
test_api "${TEST_ROOT}/sku/M-SW-HOOD-L-B" "GET" "{}" "check_output/seed_test3"
test_api "${TEST_ROOT}/search/sku?size=small&color=gray" "GET" "{}" "check_output/seed_test4"
test_api "${TEST_ROOT}/search/sku?size=small" "GET" "{}" "check_output/seed_test5"

end_test
