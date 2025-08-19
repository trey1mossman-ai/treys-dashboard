#!/bin/bash

# Test script for Agenda Dashboard Tag Dropdown Fix
echo "🧪 Testing Agenda Dashboard Tag Dropdown Fix..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies if needed...${NC}"
npm install

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""
echo -e "${YELLOW}🚀 Starting development server...${NC}"
echo -e "${GREEN}The app will open at http://localhost:5173${NC}"
echo ""
echo "📋 Test Steps:"
echo "1. Click the '+ Add Item' button in the Agenda section"
echo "2. Fill in the title and times"
echo "3. Click the Tag dropdown - it should now open!"
echo "4. Select a tag from the list:"
echo "   - None"
echo "   - Deep Work"
echo "   - Movement"
echo "   - Gym"
echo "   - Break"
echo "   - Meeting"
echo "   - Personal"
echo "5. Save the item and verify the tag appears"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop the server when done testing${NC}"
echo ""

# Start the dev server
npm run dev