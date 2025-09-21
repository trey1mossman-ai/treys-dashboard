#!/usr/bin/env node

// Performance Monitor Script - Day 3-4
// Team Lead: Claude
// Tracks bundle size, performance metrics, and build health

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Thresholds (from style guide requirements)
const THRESHOLDS = {
  bundleSize: 400 * 1024, // 400KB max (emergency ok)
  tti: 3000, // 3 seconds TTI
  fcp: 1500, // 1.5 seconds FCP
  cls: 0.1, // Cumulative Layout Shift
  fid: 100, // First Input Delay
  lcp: 2500 // Largest Contentful Paint
};

class PerformanceMonitor {
  constructor() {
    this.distPath = path.join(__dirname, '../dist');
    this.srcPath = path.join(__dirname, '../src');
    this.results = {
      timestamp: new Date().toISOString(),
      bundleSize: {},
      metrics: {},
      issues: [],
      score: 100
    };
  }
  
  async run() {
    console.log(`${colors.cyan}🔍 Trey's Dashboard Performance Monitor${colors.reset}\n`);
    
    // Check if build exists
    if (!fs.existsSync(this.distPath)) {
      console.error(`${colors.red}❌ Build directory not found. Run 'npm run build' first.${colors.reset}`);
      process.exit(1);
    }
    
    await this.checkBundleSize();
    await this.checkDependencies();
    await this.checkCodeQuality();
    await this.generateReport();
    
    // Exit with error if score is below 80
    if (this.results.score < 80) {
      console.error(`${colors.red}❌ Performance score below threshold: ${this.results.score}/100${colors.reset}`);
      process.exit(1);
    }
  }
  
  async checkBundleSize() {
    console.log(`${colors.blue}📦 Checking bundle sizes...${colors.reset}`);
    
    let totalSize = 0;
    const files = fs.readdirSync(this.distPath);
    
    files.forEach(file => {
      const filePath = path.join(this.distPath, file);
      const stats = fs.statSync(filePath);
      
      if (file.endsWith('.js') || file.endsWith('.css')) {
        const sizeKB = Math.round(stats.size / 1024);
        this.results.bundleSize[file] = sizeKB;
        totalSize += stats.size;
        
        const icon = sizeKB > 100 ? '⚠️ ' : '✅';
        console.log(`  ${icon} ${file}: ${sizeKB}KB`);
      }
    });
    
    const totalKB = Math.round(totalSize / 1024);
    this.results.bundleSize.total = totalKB;
    
    if (totalSize > THRESHOLDS.bundleSize) {
      this.results.issues.push(`Bundle size (${totalKB}KB) exceeds limit (${Math.round(THRESHOLDS.bundleSize / 1024)}KB)`);
      this.results.score -= 20;
      console.log(`  ${colors.red}❌ Total: ${totalKB}KB (limit: ${Math.round(THRESHOLDS.bundleSize / 1024)}KB)${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✅ Total: ${totalKB}KB${colors.reset}`);
    }
    
    console.log('');
  }
  
  async checkDependencies() {
    console.log(`${colors.blue}📚 Checking dependencies...${colors.reset}`);
    
    try {
      // Check for outdated dependencies
      const { stdout } = await execPromise('npm outdated --json || true');
      if (stdout) {
        const outdated = JSON.parse(stdout);
        const count = Object.keys(outdated).length;
        if (count > 5) {
          this.results.issues.push(`${count} outdated dependencies found`);
          console.log(`  ${colors.yellow}⚠️  ${count} packages need updates${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.green}✅ All dependencies up to date${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.yellow}⚠️  Could not check dependencies${colors.reset}`);
    }
    
    console.log('');
  }
  
  async checkCodeQuality() {
    console.log(`${colors.blue}🎨 Checking code quality...${colors.reset}`);
    
    // Check for console.log statements
    const checkForConsole = () => {
      let consoleCount = 0;
      const checkFile = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/console\.(log|error|warn|debug)/g);
        if (matches) {
          consoleCount += matches.length;
        }
      };
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath);
          } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            checkFile(filePath);
          }
        });
      };
      
      walkDir(this.srcPath);
      return consoleCount;
    };
    
    // Check for TODO comments
    const checkForTodos = () => {
      let todoCount = 0;
      const checkFile = (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/TODO|FIXME|HACK/g);
        if (matches) {
          todoCount += matches.length;
        }
      };
      
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath);
          } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            checkFile(filePath);
          }
        });
      };
      
      walkDir(this.srcPath);
      return todoCount;
    };
    
    const consoleCount = checkForConsole();
    const todoCount = checkForTodos();
    
    if (consoleCount > 0) {
      console.log(`  ${colors.yellow}⚠️  ${consoleCount} console statements found${colors.reset}`);
      this.results.issues.push(`${consoleCount} console statements in production code`);
      this.results.score -= 5;
    } else {
      console.log(`  ${colors.green}✅ No console statements${colors.reset}`);
    }
    
    if (todoCount > 0) {
      console.log(`  ${colors.yellow}⚠️  ${todoCount} TODO/FIXME comments found${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✅ No TODO comments${colors.reset}`);
    }
    
    console.log('');
  }
  
  async generateReport() {
    console.log(`${colors.cyan}📊 Performance Report${colors.reset}`);
    console.log('═══════════════════════════════════════');
    
    const scoreColor = this.results.score >= 90 ? colors.green : 
                       this.results.score >= 80 ? colors.yellow : 
                       colors.red;
    
    console.log(`Score: ${scoreColor}${this.results.score}/100${colors.reset}`);
    console.log(`Bundle Size: ${this.results.bundleSize.total}KB / ${Math.round(THRESHOLDS.bundleSize / 1024)}KB`);
    
    if (this.results.issues.length > 0) {
      console.log(`\n${colors.yellow}Issues Found:${colors.reset}`);
      this.results.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    // Save report to JSON
    const reportPath = path.join(__dirname, '../performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n${colors.green}✅ Report saved to performance-report.json${colors.reset}`);
    
    // Day 3-4 specific checks
    console.log(`\n${colors.cyan}Day 3-4 Checklist:${colors.reset}`);
    const checklist = [
      { name: 'IndexedDB service created', check: fs.existsSync(path.join(this.srcPath, 'services/db.ts')) },
      { name: 'useOptimizedData hook', check: fs.existsSync(path.join(this.srcPath, 'hooks/useOptimizedData.ts')) },
      { name: 'Bundle < 400KB', check: this.results.bundleSize.total < 400 },
      { name: 'No console statements', check: !this.results.issues.some(i => i.includes('console')) }
    ];
    
    checklist.forEach(({ name, check }) => {
      const icon = check ? `${colors.green}✅` : `${colors.red}❌`;
      console.log(`  ${icon} ${name}${colors.reset}`);
    });
  }
}

// Run the monitor
const monitor = new PerformanceMonitor();
monitor.run().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});