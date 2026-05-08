const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRecentNFs() {
    const { data: policies, error: pError } = await supabase
        .rpc('get_policies', { table_name: 'notas_fiscais' })
    
    // If rpc fails, try direct query
    const { data: policies2, error: pError2 } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'notas_fiscais')

    if (pError2) {
        console.error('Error fetching policies:', pError2)
    } else {
        console.log('Policies for notas_fiscais:', policies2)
    }

    const { data: nfs, error } = await supabase
        .from('notas_fiscais')
        .select('id, status, created_at, referencia, origem_tipo, origem_id, retorno_focus')
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Recent NFs:')
    nfs.forEach(nf => {
        const oculto = (nf.retorno_focus && nf.retorno_focus._sistema_oculto) || false
        console.log(`ID: ${nf.id} | Status: ${nf.status} | Created: ${nf.created_at} | Ref: ${nf.referencia} | Tipo: ${nf.origem_tipo} | OrigemID: ${nf.origem_id} | Oculto: ${oculto}`)
    })
}

checkRecentNFs()
