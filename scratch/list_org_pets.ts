import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
    // Organização do Michel: 5cd6fa59-d558-4b4c-a104-a150dca6570d
    const orgId = '5cd6fa59-d558-4b4c-a104-a150dca6570d'
    console.log('Listando pets da org:', orgId)

    // Como pets não tem a coluna org_id direta, o join é via customers
    const { data: pets, error } = await supabase
        .from('pets')
        .select(`
            id,
            name,
            customer_id,
            customers (
                id,
                name,
                org_id
            )
        `)

    if (error) {
        console.error('Erro ao buscar pets:', error)
        return
    }

    // Filtrar pets onde customers.org_id é orgId
    const orgPets = pets?.filter((p: any) => p.customers?.org_id === orgId) || []

    console.log(`Pets cadastrados na organização (${orgPets.length}):`)
    orgPets.forEach((p: any) => {
        console.log(`- Nome: ${p.name} | Tutor: ${p.customers?.name}`)
    })

    // Listar as vacinas desses pets para ver se tem alguma vencendo
    if (orgPets.length > 0) {
        const petIds = orgPets.map((p: any) => p.id)
        const { data: vaccines, error: err2 } = await supabase
            .from('pet_vaccines')
            .select(`
                name,
                expiry_date,
                pet_id,
                pets (name)
            `)
            .in('pet_id', petIds)

        if (err2) {
            console.error('Erro ao buscar vacinas:', err2)
            return
        }

        console.log(`Vacinas desses pets (${vaccines?.length || 0}):`, vaccines)
    }
}

check()
