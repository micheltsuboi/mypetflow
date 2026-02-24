import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, organizations(name, subdomain)')
        .eq('email', 'bruna@gmail.com')
        .maybeSingle()
    
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Profile:', JSON.stringify(profile, null, 2))
    }
}

check()
