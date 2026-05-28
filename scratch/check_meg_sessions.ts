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
  console.log('--- BUSCANDO ORGANIZAÇÕES ---');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name');
  
  if (orgError) {
    console.error('Erro ao buscar organizações:', orgError);
    return;
  }
  
  const imperialOrgs = orgs.filter(o => o.name.toLowerCase().includes('imperial'));
  console.log('Organizações com "Imperial":', imperialOrgs);
  
  console.log('\n--- BUSCANDO PETS CHAMADOS MEG ---');
  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id, name, customer_id, customers(org_id, name)');
  
  if (petsError) {
    console.error('Erro ao buscar pets:', petsError);
    return;
  }
  
  const megPets = pets.filter(p => p.name.toLowerCase().includes('meg'));
  console.log('Pets chamados Meg:', JSON.stringify(megPets, null, 2));

  // Filtra Meg da Vet Imperial
  const imperialOrgIds = imperialOrgs.map(o => o.id);
  const megImperial = megPets.filter(p => p.customers && imperialOrgIds.includes((p.customers as any).org_id));
  console.log('\nMeg da Vet Imperial:', JSON.stringify(megImperial, null, 2));

  if (megImperial.length === 0) {
    console.log('Nenhum pet Meg encontrado para a organização Vet Imperial.');
    return;
  }

  for (const pet of megImperial) {
    console.log(`\n--- ANÁLISE DE MENSALIDADES PARA PET: ${pet.name} (ID: ${pet.id}) ---`);
    
    // Buscar customer_packages (mensalidades)
    const { data: packages, error: pkgError } = await supabase
      .from('customer_packages')
      .select('id, pet_id, service_packages(name), is_active')
      .eq('pet_id', pet.id);
      
    if (pkgError) {
      console.error('Erro ao buscar mensalidades:', pkgError);
      continue;
    }
    
    console.log(`Mensalidades encontradas (${packages.length}):`, JSON.stringify(packages, null, 2));
    
    for (const pkg of packages) {
      console.log(`\nSessões da mensalidade ${pkg.id} (${pkg.service_packages?.name || 'Sem nome'}):`);
      
      // Buscar package_sessions
      const { data: sessions, error: sessError } = await supabase
        .from('package_sessions')
        .select('id, session_number, scheduled_at, status')
        .eq('customer_package_id', pkg.id)
        .order('session_number', { ascending: true });
        
      if (sessError) {
        console.error('Erro ao buscar sessões:', sessError);
        continue;
      }
      
      console.log('Todas as sessões:', sessions);
      
      const problematic = sessions.filter(s => {
        if (!s.scheduled_at) return true;
        const year = new Date(s.scheduled_at).getFullYear();
        return year === 1969 || year === 1970;
      });
      
      console.log('Sessões problemáticas (1969/1970 ou nulas):', problematic);
    }
  }
}

run().catch(console.error);
