#!/usr/bin/env node

// import { execSync } from 'child_process'; // Not used in current implementation
import fs from 'fs';
import path from 'path';

console.log('🧪 Test Suite Summary');
console.log('====================\n');

// Test file counts
const testDirs = [
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  'tests/security',
  'tests/performance'
];

let totalTests = 0;
let totalFiles = 0;

testDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir, { recursive: true })
      .filter(file => file.endsWith('.test.ts') || file.endsWith('.spec.ts'));
    
    const testCount = files.length;
    totalFiles += testCount;
    
    console.log(`📁 ${dir}: ${testCount} test files`);
    
    // Count test cases in each file
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const testMatches = content.match(/(it|test)\s*\(/g);
      
      if (testMatches) {
        totalTests += testMatches.length;
      }
    });
  }
});

console.log(`\n📊 Total: ${totalFiles} test files, ~${totalTests} test cases`);

// Check if test scripts are available
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const testScripts = Object.keys(packageJson.scripts).filter(script => script.startsWith('test'));

console.log('\n🚀 Available test commands:');
testScripts.forEach(script => {
  console.log(`   npm run ${script}`);
});

// Check configuration files
const configFiles = [
  'vitest.config.ts',
  'playwright.config.ts',
  '.github/workflows/test.yml',
  'codecov.yml'
];

console.log('\n⚙️  Configuration files:');
configFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Check test directories
console.log('\n📂 Test directories:');
testDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  const files = exists ? fs.readdirSync(dir, { recursive: true }).length : 0;
  console.log(`   ${exists ? '✅' : '❌'} ${dir} (${files} files)`);
});

console.log('\n🎯 Coverage targets:');
console.log('   Unit tests: 80%+');
console.log('   Integration tests: 70%+');
console.log('   Overall: 75%+');

console.log('\n⏱️  Performance targets:');
console.log('   Unit tests: < 1 minute');
console.log('   Integration tests: < 5 minutes');
console.log('   E2E tests: < 10 minutes');
console.log('   Total CI/CD: < 15 minutes');

console.log('\n✨ Test suite is ready for CI/CD!');
console.log('Run "npm run test:ci" to execute all tests.');
