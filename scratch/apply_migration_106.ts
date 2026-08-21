import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim()
    }
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  try {
    console.log('--- LENDO ARQUIVO DE MIGRAÇÃO 106 ---');
    const sql = fs.readFileSync('supabase/migrations/106_fix_subscription_due_date.sql', 'utf8');

    console.log('Aplicando no banco Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao aplicar migração 106:', error);
    } else {
      console.log('✅ Migração 106 aplicada com sucesso! Retorno:', data);
    }
  } catch (err: any) {
    console.error('Erro fatal:', err.message);
  }
}

run();
