import { supabase } from './src/services/supabase.js';

console.log('🔧 Testing Supabase Connection...\n');

async function testSupabase() {
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data: test, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (testError && testError.message.includes('relation "public.projects" does not exist')) {
      console.log('   ⚠️  Tables not created yet - run migration first');
      console.log('   Run the SQL in migrations/001_create_lifeos_schema.sql');
    } else if (testError) {
      console.log('   ❌ Connection failed:', testError.message);
      return;
    } else {
      console.log('   ✅ Connected to Supabase!');
    }
    
    // Test 2: Check auth status
    console.log('\n2. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (user) {
      console.log('   ✅ Authenticated as:', user.email);
    } else {
      console.log('   ℹ️  Not authenticated (that\'s okay for now)');
    }
    
    // Test 3: Try anonymous access
    console.log('\n3. Testing anonymous access...');
    const { data: anonTest, error: anonError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('   ℹ️  Anonymous access blocked (good for security)');
    } else {
      console.log('   ⚠️  Anonymous access allowed (check RLS policies)');
    }
    
    console.log('\n✅ Supabase connection test complete!');
    console.log('\nNext steps:');
    console.log('1. Run the migration SQL in Supabase dashboard');
    console.log('2. Set up authentication if needed');
    console.log('3. Start using cloud sync in the app');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabase();
