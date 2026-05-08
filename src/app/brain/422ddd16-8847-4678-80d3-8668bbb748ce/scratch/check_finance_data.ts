import { createClient } from './src/lib/supabase/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient()

async function checkData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.log('No user')
        return
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
    
    if (!profile) {
        console.log('No profile')
        return
    }

    const org_id = profile.org_id
    console.log('Org ID:', org_id)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: txs } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('org_id', org_id)
        .gte('date', startOfMonth)
    
    console.log('Transactions this month:', txs?.length || 0)
    if (txs && txs.length > 0) {
        console.log('First TX:', txs[0])
    }

    const { data: sales } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', org_id)
        .eq('payment_status', 'paid')
        .gte('created_at', startOfMonth)
    
    console.log('Paid sales this month:', sales?.length || 0)
}

checkData()
