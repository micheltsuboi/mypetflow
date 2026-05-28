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
  const sessionIds = [
    '4972d7cb-26d2-4fd8-a288-eb66a855a4e3',
    '6260a7ae-fb8c-40fa-8859-7be671aa286c'
  ];

  console.log('--- BUSCANDO DETALHES DAS SESSÕES PROBLEMÁTICAS ---');
  const { data: sessions, error: sessError } = await supabase
    .from('package_sessions')
    .select('*')
    .in('id', sessionIds);

  if (sessError) {
    console.error('Erro ao buscar sessões:', sessError);
    return;
  }

  console.log('Sessões a serem excluídas:', JSON.stringify(sessions, null, 2));

  // Verifica se há appointments vinculados
  for (const s of sessions) {
    if (s.appointment_id) {
      console.log(`Sessão ${s.id} está vinculada ao appointment ID: ${s.appointment_id}. Excluindo o appointment...`);
      const { error: apptError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', s.appointment_id);
        
      if (apptError) {
        console.error(`Erro ao excluir appointment ${s.appointment_id}:`, apptError);
      } else {
        console.log(`Appointment ${s.appointment_id} excluído com sucesso!`);
      }
    }
  }

  console.log('\n--- EXCLUINDO AS SESSÕES EM PACKAGE_SESSIONS ---');
  const { data: deleteData, error: deleteError } = await supabase
    .from('package_sessions')
    .delete()
    .in('id', sessionIds)
    .select();

  if (deleteError) {
    console.error('Erro ao excluir sessões:', deleteError);
    return;
  }

  console.log('Sessões excluídas com sucesso:', JSON.stringify(deleteData, null, 2));
}

run().catch(console.error);
