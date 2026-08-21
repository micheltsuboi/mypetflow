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
    const brunaOrgId = '5cd6fa59-d558-4b4c-a104-a150dca6570d'
    
    // 1. Tentar rodar a renovação para a Bruna (simulando o mês de Julho)
    // O renewSubscriptionsForOrg no código calcula a data com base em now() (Julho)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] // '2026-07-01'
    console.log(`Mês de Referência: ${monthStart}`)

    // Vamos buscar as assinaturas ativas da Bruna
    const { data: subscriptions, error: subErr } = await supabase
        .from('customer_packages')
        .select('id, pet_id, preferred_days_of_week, preferred_time, service_packages(name, total_price)')
        .eq('org_id', brunaOrgId)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .eq('paused', false)

    if (subErr) {
      console.error("Erro ao buscar assinaturas da Bruna:", subErr)
      return
    }

    console.log(`Assinaturas encontradas para a Bruna: ${subscriptions?.length}`)

    for (const sub of subscriptions || []) {
      console.log(`\nProcessando sub: ${sub.id}`)
      
      // Check sessions for current month
      const { count, error: countErr } = await supabase
          .from('package_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('customer_package_id', sub.id)
          .gte('period_start', monthStart)

      if (countErr) {
        console.error("Erro ao verificar sessões:", countErr)
        continue
      }

      console.log(`Sessões no mês atual (${monthStart}): ${count}`)

      if ((count ?? 0) === 0) {
        console.log("Tentando executar RPC generate_subscription_sessions_for_month...")
        const { data: genRes, error: genErr } = await supabase.rpc('generate_subscription_sessions_for_month', {
            p_customer_package_id: sub.id,
            p_month_start: monthStart
        })

        if (genErr) {
          console.error("❌ Erro no RPC generate_subscription_sessions_for_month:", genErr)
        } else {
          console.log("✅ RPC executado com sucesso! Sessões geradas:", genRes)
        }

        console.log("Tentando executar RPC create_appointments_from_subscription_sessions...")
        const { data: apptRes, error: apptErr } = await supabase.rpc('create_appointments_from_subscription_sessions', {
            p_customer_package_id: sub.id,
            p_org_id: brunaOrgId
        })

        if (apptErr) {
          console.error("❌ Erro no RPC create_appointments_from_subscription_sessions:", apptErr)
        } else {
          console.log("✅ RPC de agendamentos executado com sucesso! Agendamentos:", apptRes)
        }
      }
    }

  } catch (err: any) {
    console.error("Erro fatal:", err.message)
  }
}

run()
