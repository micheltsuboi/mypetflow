import { createClient } from './src/lib/supabase/client'
import 'dotenv/config'

async function findOrg() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', '%Vet Imperial%')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Orgs found:', JSON.stringify(data, null, 2))
}

findOrg()
