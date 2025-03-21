#!/bin/bash

cd "$(dirname "$0")"
. _harness.sh

test_api "${TEST_ROOT}/product/NEW-PROD" "PUT" '{ "productId": "NEW-PROD", "name": "New Product" }' "check_output/empty"
test_api "${TEST_ROOT}/attributes" "PATCH" '["Material"]' "check_output/change_test1"
test_api "${TEST_ROOT}/sku/BAD-SKU" "PUT" '{ "sku": "BAD-SKU", "productId": "BAD-PROD", "attributes": { "Material": "Wool", "Size": "Large" } }' "check_output/change_test3"
test_api "${TEST_ROOT}/sku/BAD-SKU" "PUT" '{ "sku": "BAD-SKU", "productId": "NEW-PROD", "attributes": { "Attribute": "Bad", "Size": "Large" } }' "check_output/change_test4"
test_api "${TEST_ROOT}/sku/NEW-PROD-Wool" "PUT" '{ "sku": "NEW-PROD-Wool", "productId": "NEW-PROD", "attributes": { "Material": "Wool", "Size": "Large" } }' "check_output/empty"
test_api "${TEST_ROOT}/search/sku?size=large" "GET" "{}" "check_output/change_test2"

end_test
