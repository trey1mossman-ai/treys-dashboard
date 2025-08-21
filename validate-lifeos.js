#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating Life OS Implementation...\n');

const requiredFiles = [
  'src/lib/ai/openai-client.ts',
  'src/lib/ai/cost-controller.ts',
  'src/lib/ai/model-router.ts',
  'src/lib/database/local-brain.ts',
  'src/lib/intelligence/pattern-detector.ts',
  'src/lib/automation/autopilot-v2.ts',
  'src/lib/integrations/google-calendar.ts',
  'src/components/UniversalCommand.tsx',
  'src/components/CostMonitor.tsx',
  'src/components/PatternInsights.tsx',
  'src/components/AutoPilotNotifications.tsx',
  'src/hooks/useAIEventListeners.ts',
  'src/features/agenda/useAgendaStore.ts',
  'src/features/nutrition/useNutritionStore.ts'
];

const modifiedFiles = [
  'src/App.tsx',
  'src/features/assistant/AssistantDock.tsx',
  'src/pages/Settings.tsx'
];

let allGood = true;
let missingFiles = [];
let existingFiles = [];

console.log('📁 Checking required files:\n');

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) {
    allGood = false;
    missingFiles.push(file);
  } else {
    existingFiles.push(file);
  }
});

console.log('\n📝 Checking modified files:\n');

modifiedFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) {
    allGood = false;
    missingFiles.push(file);
  }
});

// Check for API key configuration
console.log('\n🔑 Checking API configuration:\n');

const envFiles = ['.env', '.env.local', '.env.production'];
let hasApiKey = false;

for (const envFile of envFiles) {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('VITE_OPENAI_API_KEY') && envContent.includes('sk-')) {
      hasApiKey = true;
      console.log(`✅ OpenAI API key found in ${envFile}`);
      break;
    }
  }
}

if (!hasApiKey) {
  console.log('❌ OpenAI API key not configured');
  console.log('   Add VITE_OPENAI_API_KEY=sk-proj-... to .env.local');
  allGood = false;
} else {
  console.log('✅ API configuration valid');
}

// Check package.json dependencies
console.log('\n📦 Checking dependencies:\n');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['openai', 'zustand', 'cmdk', 'sonner'];
  
  requiredDeps.forEach(dep => {
    const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    console.log(`${hasDep ? '✅' : '⚠️'} ${dep}`);
    if (!hasDep) {
      console.log(`   Run: npm install ${dep}`);
    }
  });
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 VALIDATION SUMMARY:\n');

if (existingFiles.length > 0) {
  console.log(`✅ ${existingFiles.length} files created successfully`);
}

if (missingFiles.length > 0) {
  console.log(`\n❌ ${missingFiles.length} files missing:`);
  missingFiles.forEach(file => console.log(`   - ${file}`));
}

if (allGood && hasApiKey) {
  console.log('\n🎉 Life OS is ready to run!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Test the AI assistant');
  console.log('3. Check AutoPilot is running (console logs)');
  console.log('4. Try natural language commands with /');
} else {
  console.log('\n⚠️ Some issues need to be resolved:');
  if (!hasApiKey) {
    console.log('1. Add your OpenAI API key to .env.local');
  }
  if (missingFiles.length > 0) {
    console.log('2. Create the missing files listed above');
  }
}

console.log('\n' + '='.repeat(50));

process.exit(allGood && hasApiKey ? 0 : 1);