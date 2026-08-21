import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
    // 1. Listar perfis para ver qual é a organização do Michel
    const { data: profiles, error: err1 } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, org_id')
        .ilike('full_name', '%michel%')

    if (err1) {
        console.error('Erro ao buscar perfis:', err1)
        return
    }

    console.log('Perfis encontrados:', profiles)

    if (profiles && profiles.length > 0) {
        const orgId = profiles[0].org_id
        console.log('Organização do Michel:', orgId)

        // 2. Verificar se o pet Theodor e o customer Michel pertencem a essa mesma organização
        const { data: petData, error: err2 } = await supabase
            .from('pets')
            .select(`
                id,
                name,
                org_id,
                customer_id,
                customers (
                    id,
                    name,
                    org_id
                )
            `)
            .eq('name', 'Theodor')

        if (err2) {
            console.error('Erro ao buscar pet Theodor:', err2)
            return
        }

        console.log('Pet Theodor no banco:', JSON.stringify(petData, null, 2))
    }
}

check()
