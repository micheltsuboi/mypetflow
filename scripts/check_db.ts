
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPricingRules() {
    const { data, error } = await supabase.from('pricing_rules').select('*').limit(5)
    if (error) {
        console.error('Error querying pricing_rules:', error.message)
    } else {
        console.log('Found pricing_rules table. Sample data:', data)
    }
}

checkPricingRules()
