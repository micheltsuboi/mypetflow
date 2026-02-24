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

async function fix() {
    // Check if Pet da Bru org exists
    const { data: org } = await supabase.from('organizations').select('*').eq('name', 'Pet da Bru').single();
    
    // We can just wipe the user completely so the user can recreate it
    const { data: profiles } = await supabase.from('profiles').select('*').eq('email', 'bruna@gmail.com');
    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log('Deleting auth user', userId);
        const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
        if (delErr) {
            console.error('Error deleting auth user:', delErr);
        } else {
            console.log('User deleted from auth.');
        }
    }

    if (org) {
        console.log('Deleting hanging organization', org.id);
        await supabase.from('organizations').delete().eq('id', org.id);
    }
}
fix();
