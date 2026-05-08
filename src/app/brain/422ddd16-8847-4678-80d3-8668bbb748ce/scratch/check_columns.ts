import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'notas_fiscais' })
    if (error) {
        // If RPC doesn't exist, try a sample query
        const { data: sample, error: sampleError } = await supabase.from('notas_fiscais').select('*').limit(1)
        if (sampleError) {
            console.error('Error:', sampleError)
        } else {
            console.log('Columns:', Object.keys(sample[0] || {}))
        }
    } else {
        console.log('Columns:', data)
    }
}

checkColumns()
