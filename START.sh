#!/bin/bash

clear
echo "
╔════════════════════════════════════════╗
║     AGENDA DASHBOARD - QUICK START     ║
╚════════════════════════════════════════╝

Choose how to run:
1) Web App (Browser)
2) Desktop App (Native Mac)
3) Fix Issues First
4) Run Tests

Enter choice (1-4): "
read choice

case $choice in
  1)
    ./fix-and-run.sh
    ;;
  2)
    ./run-desktop.sh
    ;;
  3)
    echo "Fixing all issues..."
    rm -rf .wrangler/state
    rm -rf node_modules
    npm install
    ./fix-and-run.sh
    ;;
  4)
    ./test-everything.sh
    ;;
  *)
    echo "Invalid choice"
    ;;
esac