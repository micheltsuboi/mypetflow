import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runSql() {
    const filePath = process.argv[2]
    if (!filePath) {
        console.error('Usage: ts-node run_sql.ts <file_path>')
        return
    }

    const sql = fs.readFileSync(filePath, 'utf8')
    
    // We use a trick: Postgres can run multiple statements in an RPC if we use a helper
    // Or we can just use the supabase.rpc('exec_sql', { sql }) if it exists.
    // If not, we might have to use a different approach.
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
        console.error('Error executing SQL:', error)
    } else {
        console.log('SQL executed successfully:', data)
    }
}

runSql()
