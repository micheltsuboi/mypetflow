import { createClient } from './src/lib/supabase/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient()

async function checkNFs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.log('No user session')
        return
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
    
    if (!profile) {
        console.log('No profile found')
        return
    }

    console.log('Checking NFs for Org:', profile.org_id)

    const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: nfs, error } = await supabase
        .from('notas_fiscais')
        .select('id, status, created_at, retorno_focus, origem_id, origem_tipo')
        .eq('org_id', profile.org_id)
        .gte('created_at', lastHour)
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Total NFs found in last hour:', nfs.length)
    nfs.forEach(nf => {
        const oculto = (nf.retorno_focus as any)?._sistema_oculto
        console.log(`ID: ${nf.id} | Status: ${nf.status} | Created: ${nf.created_at} | Oculto: ${oculto} | Tipo: ${nf.origem_tipo} | OrigemID: ${nf.origem_id}`)
    })
}

checkNFs()
