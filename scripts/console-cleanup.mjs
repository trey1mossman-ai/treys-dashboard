#!/usr/bin/env node

// Console Statement Cleanup Script - Day 6
// Team Lead: Claude
// Removes or conditionalizes console statements for production

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.join(__dirname, '../src');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let totalConsolesFound = 0;
let totalConsolesFixed = 0;
const filesProcessed = [];

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let consolesInFile = 0;
  let fixedInFile = 0;
  
  // Pattern to match console statements
  const consolePattern = /console\.(log|error|warn|debug|info)\(/g;
  
  // Count console statements
  const matches = content.match(consolePattern);
  if (matches) {
    consolesInFile = matches.length;
    totalConsolesFound += consolesInFile;
    
    // Replace console.log with conditional logging
    modified = content.replace(
      /console\.(log|error|warn|debug|info)\(/g,
      (match, method) => {
        // Keep console.error and console.warn in production
        if (method === 'error' || method === 'warn') {
          return match;
        }
        
        fixedInFile++;
        totalConsolesFixed++;
        
        // Wrap in development check
        return `process.env.NODE_ENV === 'development' && console.${method}(`;
      }
    );
    
    // Fix any already conditional ones to avoid duplication
    modified = modified.replace(
      /process\.env\.NODE_ENV === 'development' && process\.env\.NODE_ENV === 'development' &&/g,
      `process.env.NODE_ENV === 'development' &&`
    );
    
    // Write back if changes were made
    if (modified !== content) {
      fs.writeFileSync(filePath, modified, 'utf8');
      filesProcessed.push({
        file: path.relative(srcPath, filePath),
        found: consolesInFile,
        fixed: fixedInFile
      });
    }
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        walkDirectory(filePath);
      }
    } else if (
      file.endsWith('.ts') || 
      file.endsWith('.tsx') || 
      file.endsWith('.js') || 
      file.endsWith('.jsx')
    ) {
      processFile(filePath);
    }
  });
}

console.log(`${colors.cyan}🧹 Console Statement Cleanup Script${colors.reset}\n`);
console.log(`${colors.blue}Scanning ${srcPath}...${colors.reset}\n`);

// Process all files
walkDirectory(srcPath);

// Report results
console.log(`${colors.cyan}📊 Cleanup Results${colors.reset}`);
console.log('═══════════════════════════════════════');
console.log(`Total Console Statements Found: ${colors.yellow}${totalConsolesFound}${colors.reset}`);
console.log(`Statements Wrapped for Dev Only: ${colors.green}${totalConsolesFixed}${colors.reset}`);
console.log(`Statements Left (errors/warnings): ${colors.yellow}${totalConsolesFound - totalConsolesFixed}${colors.reset}`);

if (filesProcessed.length > 0) {
  console.log(`\n${colors.blue}Files Modified:${colors.reset}`);
  filesProcessed.forEach(({ file, found, fixed }) => {
    console.log(`  ✓ ${file}: ${found} found, ${fixed} wrapped`);
  });
}

console.log(`\n${colors.green}✅ Console cleanup complete!${colors.reset}`);
console.log(`${colors.cyan}Next step: Run 'npm run build' to verify everything still works.${colors.reset}`);