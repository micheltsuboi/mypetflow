import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

async function checkOrgs() {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath })
    } else {
        dotenv.config()
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
        .from('organizations')
        .select('name, subdomain')

    if (error) {
        console.error('Error fetching orgs:', error)
        return
    }

    console.log('Organizations:', JSON.stringify(data, null, 2))
}

checkOrgs()
