import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { NotaFiscal } from '@/types/database'
import NotaFiscalList from './NotaFiscalList'

export default async function NotaFiscalPage() {
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

    // Check if the fiscal configuration exists
    const { data: config } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('org_id', profile.org_id)
        .single()

    // Fetch notas fiscais
    const { data: notas } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Notas Fiscais</h1>
                    <p className={styles.subtitle}>Gerencie suas notas emitidas pelo sistema</p>
                </div>
                <Link href="/owner/configuracoes/nota-fiscal" className={styles.settingsButton}>
                    ⚙️ Configurações Fiscais
                </Link>
            </div>

            {!config ? (
                <div className={styles.card}>
                    <p>Você ainda não configurou a emissão de notas fiscais.</p>
                    <Link href="/owner/configuracoes/nota-fiscal" className={styles.primaryButton} style={{ display: 'inline-block', marginTop: '1rem' }}>
                        Configurar Agora
                    </Link>
                </div>
            ) : (
                <div className={styles.card}>
                    <NotaFiscalList notas={notas || []} orgId={profile.org_id} />
                </div>
            )}
        </div>
    )
}
