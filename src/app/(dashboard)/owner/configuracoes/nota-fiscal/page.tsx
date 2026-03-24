import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FiscalOnboardingClient from './FiscalOnboardingClient'

export default async function NotaFiscalConfigPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!profile?.org_id) {
        redirect('/login')
    }

    const { data: config } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('org_id', profile.org_id)
        .single()

    return (
        <FiscalOnboardingClient initialConfig={config} />
    )
}
