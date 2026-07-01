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
    // 1. Buscar a organização
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', '%Pet da Bru%')

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ Organização "Pet da Bru" não encontrada:', orgError || 'Nenhum resultado')
      return
    }

    const org = orgs[0]
    console.log('🏢 Organização encontrada:', {
      id: org.id,
      name: org.name,
      wa_integration_type: org.wa_integration_type,
      wa_api_url: org.wa_api_url,
      has_token: !!org.wa_api_token,
      has_client_token: !!org.wa_client_token
    })

    // 2. Buscar os clientes da organização
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id, name, phone_1, phone_2, email')
      .eq('org_id', org.id)
      .limit(10)

    if (custError || !customers) {
      console.error('❌ Erro ao buscar clientes:', custError)
      return
    }

    console.log(`👥 Total de clientes listados (amostra de 10): ${customers.length}`)
    customers.forEach(c => {
      console.log(`- Nome: ${c.name} | Phone 1: "${c.phone_1}" | Phone 2: "${c.phone_2}" | Email: "${c.email}"`)
    })

  } catch (err: any) {
    console.error('Erro geral no script:', err.message)
  }
}

run()
