import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkRLS() {
    const tableName = process.argv[2] || 'orders'
    const { data, error } = await supabase.rpc('get_policies', { table_name: tableName })
    if (error) {
        // Fallback: try to read from pg_policies via raw SQL if possible, but RPC is safer
        console.error('Error fetching policies via RPC:', error)
        // Alternative: just list some policies if we can
    } else {
        console.log(`Policies for ${tableName}:`, JSON.stringify(data, null, 2))
    }
}

checkRLS()
