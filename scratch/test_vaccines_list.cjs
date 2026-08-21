const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Carrega variáveis do .env.local
dotenv.config({ path: path.resolve('/Users/micheltsuboi/Documents/MY PET FLOW/.env.local') })

const { createClient } = require('@supabase/supabase-js')

// Registra ts-node para compilar dinamicamente o arquivo TypeScript importado
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
    target: "es2020",
    skipLibCheck: true
  }
})

// Registra tsconfig-paths para resolver o @/
const tsConfig = require('../tsconfig.json')
const tsconfigPaths = require('tsconfig-paths')
tsconfigPaths.register({
  baseUrl: './',
  paths: tsConfig.compilerOptions.paths
})

// Importa a nova Server Action
const { getAllPetVaccinations } = require('../src/app/actions/vaccine.ts')

async function run() {
  try {
    // Como a Server Action usa getUser() do Supabase local (que depende do token do cookies em next.js), 
    // no script CLI nós não temos um usuário logado na requisição HTTP.
    // Mas nós podemos "mockar" a chamada modificando o client ou simplesmente testando com o Supabase direto 
    // ou simulando que a action consiga carregar o orgId (no Next.js ela usa user.id).
    // Mas espere! No script, a Server Action vai tentar ler createClient() do server eGetUser() que vai retornar null!
    // Para podermos validar a query de fato, nós podemos testar a lógica da query no banco direto 
    // ou mockar o auth.getUser() no Supabase!
    // Como mockamos?
    // Nós podemos criar um client do Supabase com o token do usuário ou com as credenciais do admin e testar.
    // Mas o mais fácil é rodar uma simulação da query SQL direta pelo Supabase que simula a action!
    // A action faz:
    // query = supabase.from('pet_vaccines').select('...').eq('org_id', profile.org_id)
    // Vamos simular a query da action usando o Supabase local com a org da Bruna!
    
    console.log("=== SIMULAÇÃO DA QUERY DA SERVER ACTION (Dra Bruna) ===");
    const brunaOrgId = '5cd6fa59-d558-4b4c-a104-a150dca6570d'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Query geral (cronológica)
    console.log("\n1. Teste de Busca Geral (Cronológica):");
    const { data: d1, error: e1 } = await supabase
      .from('pet_vaccines')
      .select(`
          id, name, batch_number, application_date, expiry_date,
          pets!inner ( id, name, customers!inner ( id, name, phone_1 ) )
      `)
      .eq('org_id', brunaOrgId)
      .order('expiry_date', { ascending: true })

    if (e1) console.error("Erro d1:", e1)
    else console.log(`Retornou ${d1.length} registros. Primeiro vencimento:`, d1[0] ? d1[0].expiry_date : "Nenhum")

    // Teste com filtro customizado de data (Julho 2026)
    console.log("\n2. Teste de Filtro Personalizado de Datas (Julho 2026):");
    const { data: d2, error: e2 } = await supabase
      .from('pet_vaccines')
      .select(`
          id, name, expiry_date,
          pets!inner ( name, customers!inner ( name ) )
      `)
      .eq('org_id', brunaOrgId)
      .gte('expiry_date', '2026-07-01')
      .lte('expiry_date', '2026-07-31')
      .order('expiry_date', { ascending: true })

    if (e2) console.error("Erro d2:", e2)
    else console.log(`Retornou ${d2.length} registros no período de Julho/2026.`)

    // Teste com filtro customizado de data (Abril 2026)
    console.log("\n3. Teste de Filtro Personalizado de Datas (Abril 2026):");
    const { data: d3, error: e3 } = await supabase
      .from('pet_vaccines')
      .select(`
          id, name, expiry_date,
          pets!inner ( name, customers!inner ( name ) )
      `)
      .eq('org_id', brunaOrgId)
      .gte('expiry_date', '2026-04-01')
      .lte('expiry_date', '2026-04-30')
      .order('expiry_date', { ascending: true })

    if (e3) console.error("Erro d3:", e3)
    else {
      console.log(`Retornou ${d3.length} registros no período de Abril/2026:`)
      d3.forEach(item => {
        console.log(`  - Vacina: ${item.name} | Expira em: ${item.expiry_date} | Pet: ${item.pets?.name} | Tutor: ${item.pets?.customers?.name}`)
      })
    }

  } catch (err) {
    console.error("Erro fatal no teste:", err.message)
  }
}

run()
