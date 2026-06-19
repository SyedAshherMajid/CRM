#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createTestUser(email, password, name) {
  try {
    console.log(`Creating user: ${email}`);

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Auth Error:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);
    console.log('ℹ️  Database record will be created automatically on first login');
    console.log('\n📋 Test User Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   ID: ${authUser.user.id}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Create test user
const testEmail = process.argv[2] || 'test@phonestore.com';
const testPassword = process.argv[3] || 'TestPassword123!';
const testName = process.argv[4] || 'Test Manager';

createTestUser(testEmail, testPassword, testName);
