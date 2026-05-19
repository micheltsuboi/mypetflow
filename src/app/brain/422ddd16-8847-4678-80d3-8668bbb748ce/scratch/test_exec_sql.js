const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testExec() {
    const sql = `ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT false;`
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
        console.error('Error executing SQL RPC:', error)
    } else {
        console.log('SQL RPC executed successfully! Column added or already exists. Data:', data)
    }
}

testExec()
