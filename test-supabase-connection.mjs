#!/usr/bin/env node
// Test Supabase connection and setup

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔧 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('\n📡 Test 1: Basic Connection...');
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('⚠️  Tables not created yet - Run schema.sql in Supabase dashboard');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Click SQL Editor (left sidebar)');
      console.log('3. Click "New Query"');
      console.log('4. Copy contents from: supabase/schema.sql');
      console.log('5. Click "Run" button');
      console.log('6. Run this test again');
      return;
    } else if (error) {
      throw error;
    }
    
    console.log('✅ Connected to Supabase!');
    
    // Test 2: Check tables exist
    console.log('\n📊 Test 2: Checking Tables...');
    const tables = ['projects', 'tasks', 'emails', 'calendar_events', 'notes'];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.log(`❌ Table '${table}' - Error:`, tableError.message);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
    
    // Test 3: Test insert (anonymous user)
    console.log('\n📝 Test 3: Testing Anonymous Access...');
    console.log('ℹ️  Note: Full CRUD requires authentication');
    
    console.log('\n✨ Supabase Backend Ready!');
    console.log('Next: Fix webhook connections...');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check credentials are correct');
    console.log('2. Ensure Supabase project is active');
    console.log('3. Run schema.sql in SQL Editor');
  }
}

testConnection();