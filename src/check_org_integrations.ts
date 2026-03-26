
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: orgs } = await supabase
        .from('organizations')
        .select('name, subdomain, wa_integration_type, wa_api_url')
    
    console.log('Organizations:', JSON.stringify(orgs, null, 2))
}

check()
