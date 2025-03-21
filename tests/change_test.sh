#!/bin/bash

cd "$(dirname "$0")"
. _harness.sh

test_api "${TEST_ROOT}/product/NEW-PROD" "PUT" '{ "productName": "NEW-PROD", "name": "New Product" }' "check_output/empty"
test_api "${TEST_ROOT}/attributes" "PATCH" '["Material"]' "check_output/change_test1"
test_api "${TEST_ROOT}/sku/NEW-PROD-Wool" "PUT" '{ "sku": "NEW-PROD-Wool", "productName": "NEW-PROD", "attributes": { "Material": "Wool", "Size": "Large" } }' "check_output/empty"
test_api "${TEST_ROOT}/search/sku?size=large" "GET" "{}" "check_output/change_test2"

end_test
