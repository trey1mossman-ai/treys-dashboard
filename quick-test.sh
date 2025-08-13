#!/bin/bash

# Quick test with the CORRECT webhook URL
echo "Testing n8n webhook with correct URL..."
echo ""

curl -X POST http://localhost:5678/webhook-test/agenda-test \
  -H "Content-Type: application/json" \
  -d '{"test": true, "message": "Testing with correct URL"}' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "If you see HTTP Status: 200 and JSON response = SUCCESS! ✅"
echo "If you see HTTP Status: 404 = Workflow not activated ❌"