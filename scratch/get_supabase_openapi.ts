import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/micheltsuboi/Documents/MY PET FLOW/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function run() {
  const url = `${supabaseUrl}/rest/v1/`;
  console.log('Fetching OpenAPI schema from Supabase REST API:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`REST Error: ${response.statusText}`);
    }
    
    const schema = await response.json();
    const paths = Object.keys(schema.paths || {});
    console.log('Total endpoints found:', paths.length);
    
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log('RPC functions found:', rpcs);
  } catch (error) {
    console.error('Error fetching schema:', error.message);
  }
}

run().catch(console.error);
