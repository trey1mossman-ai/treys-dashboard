#!/bin/bash

# One-line test
curl -s http://localhost:5678 >/dev/null 2>&1 && echo "✅ n8n IS WORKING! Use Safari: open -a Safari http://localhost:5678" || echo "❌ n8n not running"