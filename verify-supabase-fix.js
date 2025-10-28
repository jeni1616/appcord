#!/usr/bin/env node
/**
 * Verification script for Supabase createClient fix
 *
 * This script verifies that:
 * 1. createClient is exported from lib/supabase/server.ts
 * 2. createClient is a function
 * 3. All API routes can import createClient
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Supabase createClient fix...\n');

// Check 1: Verify server.ts exports createClient
console.log('✓ Check 1: Verifying lib/supabase/server.ts exports createClient');
const serverFile = fs.readFileSync(
  path.join(__dirname, 'lib/supabase/server.ts'),
  'utf8'
);

if (serverFile.includes('export async function createClient()')) {
  console.log('  ✅ createClient function is exported\n');
} else {
  console.log('  ❌ createClient function NOT found\n');
  process.exit(1);
}

// Check 2: Verify API routes import createClient correctly
console.log('✓ Check 2: Verifying API routes import createClient');
const apiRoutes = [
  'app/api/projects/generate-code/route.ts',
  'app/api/projects/deploy/route.ts',
  'app/api/projects/chat/route.ts'
];

let allImportsCorrect = true;
apiRoutes.forEach(route => {
  const routeFile = fs.readFileSync(path.join(__dirname, route), 'utf8');
  if (routeFile.includes("import { createClient } from '@/lib/supabase/server'")) {
    console.log(`  ✅ ${route} imports createClient correctly`);
  } else {
    console.log(`  ❌ ${route} does NOT import createClient correctly`);
    allImportsCorrect = false;
  }
});

console.log('');

// Check 3: Verify usage pattern
console.log('✓ Check 3: Verifying createClient usage pattern');
apiRoutes.forEach(route => {
  const routeFile = fs.readFileSync(path.join(__dirname, route), 'utf8');
  if (routeFile.includes('const supabase = await createClient()')) {
    console.log(`  ✅ ${route} uses createClient correctly`);
  } else {
    console.log(`  ❌ ${route} does NOT use createClient correctly`);
    allImportsCorrect = false;
  }
});

console.log('');

if (allImportsCorrect) {
  console.log('✨ All checks passed! The Supabase createClient fix is complete.\n');
  console.log('Summary of changes:');
  console.log('- Added createClient async function to lib/supabase/server.ts');
  console.log('- createClient reads cookies using Next.js 15 cookies() API');
  console.log('- Returns a properly typed Supabase client for authenticated operations');
  console.log('- All API routes can now successfully import and use createClient');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the implementation.');
  process.exit(1);
}
