#!/usr/bin/env node

// Debug script to test build process and inspect output
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 === BUILD DEBUG SCRIPT ===\n');

function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Command: ${command}`);
  console.log('-'.repeat(50));
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    console.log(output);
    return true;
  } catch (error) {
    console.error('❌ Command failed:');
    console.error(error.stdout || error.message);
    return false;
  }
}

function inspectBuildOutput() {
  console.log('\n🔍 === INSPECTING BUILD OUTPUT ===\n');
  
  if (!fs.existsSync('dist/api.js')) {
    console.log('❌ dist/api.js not found - build may have failed');
    return;
  }
  
  const content = fs.readFileSync('dist/api.js', 'utf8');
  
  // Extract Firebase config
  console.log('🔥 Firebase Configuration in built file:');
  const projectIdMatch = content.match(/projectId:"([^"]*)"/);
  const apiKeyMatch = content.match(/apiKey:"([^"]*)"/);
  const authDomainMatch = content.match(/authDomain:"([^"]*)"/);
  
  console.log(`  Project ID: ${projectIdMatch ? projectIdMatch[1] : 'NOT FOUND'}`);
  console.log(`  API Key: ${apiKeyMatch ? apiKeyMatch[1].substring(0, 20) + '...' : 'NOT FOUND'}`);
  console.log(`  Auth Domain: ${authDomainMatch ? authDomainMatch[1] : 'NOT FOUND'}`);
  
  // Extract Dashboard URL
  console.log('\n🌐 Dashboard URL in built file:');
  const dashboardMatch = content.match(/DASHBOARD_URL:"([^"]*)"/);
  console.log(`  URL: ${dashboardMatch ? dashboardMatch[1] : 'NOT FOUND'}`);
  
  // Extract API Base URL
  console.log('\n🔗 API Base URL in built file:');
  const apiUrlMatch = content.match(/BASE_URL:"([^"]*)"/);
  console.log(`  URL: ${apiUrlMatch ? apiUrlMatch[1] : 'NOT FOUND'}`);
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'production';
  
  console.log(`🎯 Testing ${mode} build mode\n`);
  
  // Clean first
  runCommand('npm run clean', 'Cleaning dist folder');
  
  // Run the build
  const buildSuccess = runCommand(`npm run build:${mode === 'production' ? 'prod' : 'dev'}`, `Building in ${mode} mode`);
  
  if (buildSuccess) {
    inspectBuildOutput();
  }
  
  console.log('\n✅ Debug build complete!');
}

main().catch(console.error);
