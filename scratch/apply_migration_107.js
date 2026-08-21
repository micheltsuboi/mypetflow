const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    console.log('--- LENDO ARQUIVO DE MIGRAÇÃO 107 ---');
    const sql = fs.readFileSync('supabase/migrations/107_sipeagro_and_prescriptions.sql', 'utf8');

    console.log('Aplicando no banco Supabase via exec_sql...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao aplicar migração 107:', error);
    } else {
      console.log('✅ Migração 107 aplicada com sucesso! Retorno:', data);
    }
  } catch (err) {
    console.error('Erro fatal:', err.message);
  }
}

run();
