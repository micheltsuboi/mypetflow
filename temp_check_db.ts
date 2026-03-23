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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDateStr = tomorrow.toISOString().split('T')[0];
  
  console.log('Target date:', targetDateStr);
  
  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, pets(name), services(name), customers(phone_1), organizations(notify_reminder_24h, wa_api_url, wa_api_token, wa_integration_type)')
    .order('scheduled_at', { ascending: false })
    .limit(1000);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log(`Total appointments fetched: ${data?.length}`);
  
  if (!data || data.length === 0) {
    console.log('No appointments returned!');
    return;
  }
  
  const match = data.filter((a: any) => a.scheduled_at && a.scheduled_at.startsWith(targetDateStr));
  
  console.log(`Appointments for ${targetDateStr}:`, JSON.stringify(match, null, 2));
}

run().catch(console.error);
