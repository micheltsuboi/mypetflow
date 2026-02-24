const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0]] = parts.slice(1).join('=');
    }
});

const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function execute() {
    const sql = fs.readFileSync('supabase/migrations/047_saas_plans.sql', 'utf8');
    
    // Use the RPC endpoint if exists, but we don't have a direct raw SQL execution endpoint by default
    // We can try to use postgres:// URL if we have it in .env.local
    if (env.DATABASE_URL) {
        const { Client } = require('pg');
        const client = new Client({ connectionString: env.DATABASE_URL });
        await client.connect();
        try {
            await client.query(sql);
            console.log("Migration executed via pg module!");
        } catch (e) {
            console.error("Error executing via pg module:", e);
        } finally {
            await client.end();
        }
    } else {
        console.log("No DATABASE_URL found to execute SQL.");
    }
}

execute();
