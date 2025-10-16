#!/usr/bin/env node

// Debug script to inspect Vite configuration and environment variables
const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('🔍 === VITE CONFIG DEBUG ===\n');

// Test different modes
const modes = ['development', 'production'];

modes.forEach(mode => {
  console.log(`\n📋 MODE: ${mode.toUpperCase()}`);
  console.log('='.repeat(50));
  
  // Clear any existing env vars
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('VITE_')) {
      delete process.env[key];
    }
  });
  
  // Load the appropriate .env file
  const envFile = mode === 'production' ? '.env.prod' : '.env.development';
  console.log(`📁 Loading: ${envFile}`);
  
  if (fs.existsSync(envFile)) {
    config({ path: envFile });
    console.log(`✅ File exists and loaded`);
  } else {
    console.log(`❌ File does not exist`);
  }
  
  // Show Firebase config
  console.log('\n🔥 Firebase Configuration:');
  console.log(`  API Key: ${process.env.VITE_FIREBASE_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  Auth Domain: ${process.env.VITE_FIREBASE_AUTH_DOMAIN || 'NOT SET'}`);
  console.log(`  Project ID: ${process.env.VITE_FIREBASE_PROJECT_ID || 'NOT SET'}`);
  console.log(`  Storage Bucket: ${process.env.VITE_FIREBASE_STORAGE_BUCKET || 'NOT SET'}`);
  console.log(`  Messaging Sender ID: ${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'NOT SET'}`);
  console.log(`  App ID: ${process.env.VITE_FIREBASE_APP_ID || 'NOT SET'}`);
  
  // Show other important config
  console.log('\n🌐 Other Configuration:');
  console.log(`  API Base URL: ${process.env.VITE_API_BASE_URL || 'NOT SET'}`);
  console.log(`  Dashboard URL: ${process.env.VITE_DASHBOARD_URL || 'NOT SET'}`);
  console.log(`  Extension Debug: ${process.env.VITE_EXTENSION_DEBUG || 'NOT SET'}`);
  
  // Show full Firebase config object that would be used
  console.log('\n🏗️  Firebase Config Object:');
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };
  console.log(JSON.stringify(firebaseConfig, null, 2));
});

console.log('\n🔍 === FILE CONTENTS ===\n');

// Show .env.prod file contents
console.log('📄 .env.prod contents:');
console.log('-'.repeat(30));
if (fs.existsSync('.env.prod')) {
  const content = fs.readFileSync('.env.prod', 'utf8');
  console.log(content);
} else {
  console.log('❌ File does not exist');
}

console.log('\n📄 .env.development contents:');
console.log('-'.repeat(30));
if (fs.existsSync('.env.development')) {
  const content = fs.readFileSync('.env.development', 'utf8');
  console.log(content);
} else {
  console.log('❌ File does not exist');
}

console.log('\n✅ Debug complete!');
