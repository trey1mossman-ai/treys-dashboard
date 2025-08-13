#!/bin/bash

# Simple test script to verify the Agenda app fixes

echo "========================================="
echo "Agenda App - Comprehensive Fix Test"
echo "========================================="
echo ""

# Check if the app is running
echo "1. Checking if app is running locally..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ App is running on port 5173"
else
    echo "⚠️  App not running. Starting development server..."
    npm run dev &
    sleep 5
fi

# Test API health endpoint
echo ""
echo "2. Testing API health endpoint..."
API_RESPONSE=$(curl -s http://localhost:5173/api/health)
if [ ! -z "$API_RESPONSE" ]; then
    echo "✅ API health endpoint responding"
    echo "   Response: $API_RESPONSE"
else
    echo "⚠️  API health endpoint not responding (this is OK if using mock data)"
fi

# Open browser to test the app
echo ""
echo "3. Opening app in browser..."
if command -v open > /dev/null; then
    open http://localhost:5173
elif command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173
else
    echo "Please open http://localhost:5173 in your browser"
fi

echo ""
echo "========================================="
echo "TESTING CHECKLIST:"
echo "========================================="
echo ""
echo "✓ AI Chat Testing:"
echo "  1. Go to Workflows page"
echo "  2. Add your OpenAI or Anthropic API key in Settings first"
echo "  3. Try chatting with the AI - it should respond intelligently"
echo "  4. Ask it different questions - responses should vary"
echo "  5. Chat history should be maintained during the session"
echo ""
echo "✓ Agenda Items:"
echo "  1. Go to Dashboard"
echo "  2. Click 'Add Item' in the Agenda section"
echo "  3. Fill in the form and save"
echo "  4. Item should appear in the agenda list"
echo ""
echo "✓ Notes:"
echo "  1. In Dashboard, look for Quick Notes section"
echo "  2. Click 'New Note' button"
echo "  3. Enter note text and save"
echo "  4. Note should appear in the grid"
echo ""
echo "✓ API Keys:"
echo "  1. Go to Settings page"
echo "  2. Add your API keys (OpenAI or Anthropic)"
echo "  3. Click 'Save All Settings'"
echo "  4. Test the AI chat again - it should use your API"
echo ""
echo "========================================="
echo "If any issues persist, check the browser console for errors."
echo "========================================="
