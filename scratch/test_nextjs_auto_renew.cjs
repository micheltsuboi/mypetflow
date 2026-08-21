const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Carrega variáveis do .env.local
dotenv.config({ path: path.resolve('/Users/micheltsuboi/Documents/MY PET FLOW/.env.local') })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Registra ts-node para compilar dinamicamente o arquivo TypeScript importado
// Sobrescrevemos o compilerOptions para evitar conflito com 'bundler' no tsconfig.json do Next.js
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
    target: "es2020",
    skipLibCheck: true
  }
})

// Registra tsconfig-paths para resolver o @/ se houver imports
const tsConfig = require('../tsconfig.json')
const tsconfigPaths = require('tsconfig-paths')
tsconfigPaths.register({
  baseUrl: './',
  paths: tsConfig.compilerOptions.paths
})

// Importa a função de subscription via require no arquivo TS compilado dinamicamente
const { sendSubscriptionDueDateReminders } = require('../src/app/actions/subscription.ts')

async function run() {
  const brunaOrgId = '5cd6fa59-d558-4b4c-a104-a150dca6570d'
  
  try {
    console.log("=== 1. PREPARANDO DADOS DE TESTE (RESET) ===");
    
    // Busca as assinaturas da Bruna
    const { data: subs, error: errFetch } = await supabase
      .from('customer_packages')
      .select('id, next_renewal_date, due_date')
      .eq('org_id', brunaOrgId)
      .eq('is_subscription', true)

    if (errFetch) {
       console.error("Erro ao buscar assinaturas:", errFetch)
       return
    }

    if (!subs || subs.length === 0) {
      console.error("Nenhuma assinatura encontrada para a Bruna.");
      return;
    }

    const subIds = subs.map(s => s.id)

    // Deleta sessões de Julho (period_start >= '2026-07-01')
    const { error: delError } = await supabase
      .from('package_sessions')
      .delete()
      .in('customer_package_id', subIds)
      .gte('period_start', '2026-07-01')

    if (delError) {
      console.error("Erro ao deletar sessões de Julho:", delError)
      return
    }
    console.log("Sessões de Julho deletadas.");

    // Reseta as assinaturas do Theo para Maio/Junho
    const { error: updError } = await supabase
      .from('customer_packages')
      .update({
        next_renewal_date: '2026-07-01',
        due_date: '2026-05-20'
      })
      .in('id', subIds)

    if (updError) {
      console.error("Erro ao resetar customer_packages:", updError)
      return
    }
    console.log("Assinaturas resetadas para next_renewal_date = 2026-07-01.");

    console.log("\n=== 2. EXECUTANDO A FUNÇÃO DE DISPARO DE LEMBRETES (NEXT.JS) ===");
    console.log("Chamando sendSubscriptionDueDateReminders(brunaOrgId)...");
    
    const result = await sendSubscriptionDueDateReminders(brunaOrgId)
    console.log("Resultado da Execução:", result);

    console.log("\n=== 3. CONFERINDO OS RESULTADOS NO BANCO ===");
    const { data: updatedSubs } = await supabase
      .from('customer_packages')
      .select(`
        id, due_date, next_renewal_date, 
        pets(name), 
        service_packages(name, billing_day)
      `)
      .in('id', subIds)

    updatedSubs?.forEach(s => {
      const pet = s.pets
      const plan = s.service_packages
      console.log(`Assinatura: ${plan?.name} | Pet: ${pet?.name}`);
      console.log(`  - due_date gravado: ${s.due_date} (Deveria ser dia 10 de Julho: 2026-07-10)`);
      console.log(`  - next_renewal_date gravado: ${s.next_renewal_date} (Deveria ser 2026-08-01)`);
    })

  } catch (err) {
    console.error("Erro fatal no teste:", err.message)
  }
}

run()
