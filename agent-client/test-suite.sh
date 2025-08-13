#!/bin/bash

# Agent Command API Test Suite
# This script tests all agent command endpoints

# Configuration
BASE_URL="${AGENT_BASE_URL:-https://your-app.pages.dev}"
SERVICE_TOKEN="${AGENT_SERVICE_TOKEN}"
HMAC_SECRET="${AGENT_HMAC_SECRET}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to generate HMAC signature
generate_signature() {
    local body="$1"
    echo -n "$body" | openssl dgst -sha256 -hmac "$HMAC_SECRET" -binary | xxd -p -c256
}

# Helper function to make API call
call_api() {
    local tool="$1"
    local args="$2"
    local dry_run="${3:-false}"
    
    local body=$(jq -n \
        --arg tool "$tool" \
        --argjson args "$args" \
        --argjson dryRun "$dry_run" \
        '{tool: $tool, args: $args, dryRun: $dryRun}')
    
    local timestamp=$(date +%s)
    local idempotency_key=$(uuidgen)
    local signature="sha256=$(generate_signature "$body")"
    
    curl -s -X POST "$BASE_URL/api/agent/command" \
        -H "Authorization: Bearer $SERVICE_TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-TS: $timestamp" \
        -H "X-Idempotency-Key: $idempotency_key" \
        -H "X-Signature: $signature" \
        -d "$body"
}

# Test function
test_command() {
    local test_name="$1"
    local tool="$2"
    local args="$3"
    local expected_ok="${4:-true}"
    
    echo -n "Testing $test_name... "
    
    local response=$(call_api "$tool" "$args")
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "$expected_ok" ]; then
        echo -e "${GREEN}PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Run tests
echo "=== Agent Command API Test Suite ==="
echo ""

# Test dry run
test_command "Dry run validation" \
    "agenda.create" \
    '{"date":"2025-08-13","title":"Test","start_ts":1723568700,"end_ts":1723574100}' \
    "true"

# Test agenda operations
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -d tomorrow +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
START_TS=$(date -d "$TOMORROW 09:00:00" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$TOMORROW 09:00:00" +%s)
END_TS=$(date -d "$TOMORROW 11:00:00" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$TOMORROW 11:00:00" +%s)

test_command "Create agenda item" \
    "agenda.create" \
    "{\"date\":\"$TOMORROW\",\"title\":\"Test Meeting\",\"start_ts\":$START_TS,\"end_ts\":$END_TS,\"tag\":\"work\"}"

# Save the ID from the response for later tests
AGENDA_ID=$(call_api "agenda.listByDate" "{\"date\":\"$TOMORROW\"}" | jq -r '.result.items[0].id' 2>/dev/null)

if [ ! -z "$AGENDA_ID" ] && [ "$AGENDA_ID" != "null" ]; then
    test_command "Update agenda item" \
        "agenda.update" \
        "{\"id\":\"$AGENDA_ID\",\"patch\":{\"title\":\"Updated Meeting\"}}"
    
    test_command "List agenda by date" \
        "agenda.listByDate" \
        "{\"date\":\"$TOMORROW\"}"
fi

# Test task operations
test_command "Create task" \
    "tasks.create" \
    '{"title":"Test Task","source":"test"}'

# Test note operations
test_command "Create note" \
    "notes.create" \
    '{"body":"Test note content","tag":"test"}'

# Test metrics
test_command "Update metrics" \
    "metrics.update" \
    "{\"date\":\"$TODAY\",\"work_actual\":8.5,\"gym_actual\":1.5}"

# Test validation errors
test_command "Invalid date format (should fail)" \
    "agenda.create" \
    '{"date":"invalid","title":"Test","start_ts":1723568700,"end_ts":1723574100}' \
    "false"

test_command "End before start (should fail)" \
    "agenda.create" \
    "{\"date\":\"$TOMORROW\",\"title\":\"Bad Time\",\"start_ts\":$END_TS,\"end_ts\":$START_TS}" \
    "false"

# Test training log
test_command "Log training entries" \
    "trainer.log" \
    "{\"entries\":[{\"date\":\"$TODAY\",\"exercise\":\"Squat\",\"set_number\":1,\"reps\":5,\"load\":100,\"rpe\":7}]}"

# Test idempotency
echo ""
echo "Testing idempotency..."
IDEMPOTENCY_KEY=$(uuidgen)
BODY='{"tool":"notes.create","args":{"body":"Idempotent note"},"dryRun":false}'
TIMESTAMP=$(date +%s)
SIGNATURE="sha256=$(generate_signature "$BODY")"

# First request
RESPONSE1=$(curl -s -X POST "$BASE_URL/api/agent/command" \
    -H "Authorization: Bearer $SERVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-TS: $TIMESTAMP" \
    -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
    -H "X-Signature: $SIGNATURE" \
    -d "$BODY")

# Second request with same idempotency key
RESPONSE2=$(curl -s -X POST "$BASE_URL/api/agent/command" \
    -H "Authorization: Bearer $SERVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-TS: $TIMESTAMP" \
    -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
    -H "X-Signature: $SIGNATURE" \
    -d "$BODY")

if [ "$RESPONSE1" = "$RESPONSE2" ]; then
    echo -e "Idempotency test: ${GREEN}PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "Idempotency test: ${RED}FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Cleanup test data if needed
if [ ! -z "$AGENDA_ID" ] && [ "$AGENDA_ID" != "null" ]; then
    echo ""
    echo "Cleaning up test data..."
    call_api "agenda.delete" "{\"id\":\"$AGENDA_ID\"}" > /dev/null
fi

# Summary
echo ""
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi