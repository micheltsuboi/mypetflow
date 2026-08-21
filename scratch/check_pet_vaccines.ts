import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carrega variáveis do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa service key para bypassar RLS e ver tudo

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
    const todayStr = new Date().toLocaleDateString('en-CA')
    console.log('Buscando vacinas expirando em:', todayStr)

    // 1. Buscar todas as vacinas vencendo hoje
    const { data: allVaccinesExpiring, error: err1 } = await supabase
        .from('pet_vaccines')
        .select('*')
        .eq('expiry_date', todayStr)

    if (err1) {
        console.error('Erro ao buscar vacinas:', err1)
        return
    }

    console.log(`Encontradas ${allVaccinesExpiring?.length} vacinas com expiração para hoje:`, allVaccinesExpiring)

    // 2. Tentar buscar com relação para ver se os relacionamentos existem e não são nulos
    const { data: relData, error: err2 } = await supabase
        .from('pet_vaccines')
        .select(`
            id,
            name,
            expiry_date,
            pet_id,
            pets (
                id,
                name,
                customer_id,
                customers (
                    id,
                    name,
                    phone_1
                )
            )
        `)
        .eq('expiry_date', todayStr)

    if (err2) {
        console.error('Erro ao buscar com relacionamentos:', err2)
        return
    }

    console.log('Dados com relacionamentos:', JSON.stringify(relData, null, 2))
}

check()
