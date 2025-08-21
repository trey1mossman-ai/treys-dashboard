#!/bin/bash

# AI Integration Triage Test Script
# Run this to debug "three dots" hanging issues

BASE_URL="${1:-https://b80746fc.agenda-dashboard.pages.dev}"
echo "🔍 Testing AI Integration at: $BASE_URL"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to check test result
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# =========================================
# Test 1: Backend Health Check (Non-streaming)
# =========================================
echo -e "\n${YELLOW}Test 1: Backend Health Check (Non-streaming)${NC}"
echo "Testing basic OpenAI response without tools or streaming..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "stream": false,
    "enable_tools": false,
    "messages": [
      {"role":"system","content":"You are a terse assistant."},
      {"role":"user","content":"Return the word PINEAPPLE exactly."}
    ]
  }' --max-time 10)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
if [[ "$BODY" == *"PINEAPPLE"* ]] && [ "$HTTP_CODE" == "200" ]; then
    check_result 0
    echo "Response contains PINEAPPLE ✓"
else
    check_result 1
    echo "Response: $BODY"
    echo -e "${RED}Fix: Check API keys, model name, and server logs${NC}"
fi

# =========================================
# Test 2: Streaming Response
# =========================================
echo -e "\n${YELLOW}Test 2: Streaming Response Test${NC}"
echo "Testing SSE streaming..."

# Use curl with -N flag to disable buffering for SSE
STREAM_TEST=$(curl -s -N -X POST "$BASE_URL/api/ai/respond" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "provider": "openai",
    "stream": true,
    "enable_tools": false,
    "messages": [
      {"role":"user","content":"Count from 1 to 3."}
    ]
  }' --max-time 10 2>&1 | head -20)

if [[ "$STREAM_TEST" == *"data:"* ]]; then
    check_result 0
    echo "SSE stream detected ✓"
    echo "Sample: $(echo "$STREAM_TEST" | head -3)"
else
    check_result 1
    echo -e "${RED}No SSE data detected. Check streaming implementation.${NC}"
fi

# =========================================
# Test 3: Tool Execution (Most Common Issue)
# =========================================
echo -e "\n${YELLOW}Test 3: Tool Execution Test${NC}"
echo "Testing tool calling with a simple tool..."

TOOL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "stream": false,
    "enable_tools": true,
    "messages": [
      {"role":"user","content":"Create a task called Test Task and tell me when done."}
    ]
  }' --max-time 15)

HTTP_CODE=$(echo "$TOOL_RESPONSE" | tail -n1)
BODY=$(echo "$TOOL_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" == "200" ]; then
    check_result 0
    echo "Tool execution completed ✓"
else
    check_result 1
    echo "Response: $BODY"
    echo -e "${RED}Tool execution failed. Check Action Router and tool loop.${NC}"
fi

# =========================================
# Test 4: CORS Preflight
# =========================================
echo -e "\n${YELLOW}Test 4: CORS Preflight Test${NC}"
echo "Testing OPTIONS request..."

CORS_TEST=$(curl -s -I -X OPTIONS "$BASE_URL/api/ai/respond" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  --max-time 5)

if [[ "$CORS_TEST" == *"204"* ]] || [[ "$CORS_TEST" == *"200"* ]]; then
    check_result 0
    echo "CORS preflight working ✓"
else
    check_result 1
    echo -e "${RED}CORS preflight failed. Check handleOptions implementation.${NC}"
fi

# =========================================
# Test 5: Anthropic Provider (if configured)
# =========================================
echo -e "\n${YELLOW}Test 5: Anthropic Provider Test${NC}"
echo "Testing Anthropic integration..."

ANTHROPIC_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "stream": false,
    "enable_tools": false,
    "messages": [
      {"role":"user","content":"Say HELLO exactly."}
    ]
  }' --max-time 10)

HTTP_CODE=$(echo "$ANTHROPIC_RESPONSE" | tail -n1)
BODY=$(echo "$ANTHROPIC_RESPONSE" | head -n-1)

if [[ "$BODY" == *"HELLO"* ]] && [ "$HTTP_CODE" == "200" ]; then
    check_result 0
    echo "Anthropic working ✓"
else
    echo -e "${YELLOW}Anthropic not configured or failed (optional)${NC}"
    echo "Response: $BODY"
fi

# =========================================
# Test 6: RAG Search
# =========================================
echo -e "\n${YELLOW}Test 6: RAG/Knowledge Base Search${NC}"
echo "Testing knowledge search endpoint..."

RAG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rag/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "top_k": 3
  }' --max-time 10)

HTTP_CODE=$(echo "$RAG_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "200" ]; then
    check_result 0
    echo "RAG search endpoint working ✓"
else
    check_result 1
    echo -e "${RED}RAG search failed. Check embeddings configuration.${NC}"
fi

# =========================================
# Test Summary
# =========================================
echo -e "\n========================================="
echo -e "${YELLOW}Test Summary:${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! AI integration is working.${NC}"
else
    echo -e "\n${RED}⚠️  Some tests failed. See specific fixes above.${NC}"
    echo -e "\n${YELLOW}Common Fixes:${NC}"
    echo "1. Add API keys: wrangler secret put OPENAI_API_KEY"
    echo "2. Check model names in wrangler.toml (gpt-4o, not gpt-4o-mini)"
    echo "3. Verify KV namespaces are bound correctly"
    echo "4. Check server logs: wrangler pages tail"
    echo "5. For tool hangs: verify Action Router returns results to model"
fi

echo -e "\n${YELLOW}Debug Commands:${NC}"
echo "• View logs: wrangler pages tail --project-name=agenda-dashboard"
echo "• Test locally: wrangler pages dev dist"
echo "• Update secrets: wrangler secret put <SECRET_NAME>"