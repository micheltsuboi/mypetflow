const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0]] = parts.slice(1).join('=');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, org_id, email, full_name, is_active, organizations(name, subdomain)')
        .eq('email', 'bruna@gmail.com')
        .single();
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Profile:', JSON.stringify(profile, null, 2));
    }
}
check();
