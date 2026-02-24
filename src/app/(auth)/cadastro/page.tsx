import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import styles from './page.module.css'
import RegisterForm from '@/components/modules/RegisterForm'

export default async function CadastroPage() {
    const headerStack = await headers()
    const host = headerStack.get('host') || ''
    const supabaseAdmin = createAdminClient()

    // Detectar subdomínio
    let subdomain = ''
    if (host.includes('localhost') || host.includes('vercel.app')) {
        const { data: firstOrg } = await supabaseAdmin.from('organizations').select('subdomain').limit(1).single()
        subdomain = firstOrg?.subdomain || ''
    } else {
        subdomain = host.split('.')[0]
    }

    // Buscar dados da organização para o branding
    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('subdomain', subdomain)
        .maybeSingle()

    return (
        <main className={styles.main}>
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                <div className={styles.registerCard}>
                    <div className={styles.logoContainer}>
                        <Image
                            src="/logo.png"
                            alt="MyPet Flow"
                            width={240}
                            height={100}
                            className={styles.logoImage}
                            priority
                        />
                    </div>

                    <h1 className={styles.title} style={{ textAlign: 'center', fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                        {org?.name || 'Portal do Tutor'}
                    </h1>

                    <p className={styles.cardSubtitle} style={{ marginBottom: '1.5rem' }}>
                        {org ? `Área exclusiva para clientes ${org.name}` : 'Crie sua conta para acompanhar seu pet'}
                    </p>

                    <RegisterForm />

                    <footer className={styles.loginDivider}>
                        <span>Já tem uma conta?</span>
                        <Link href="/" className={styles.textLink}>
                            Faça Login
                        </Link>
                    </footer>
                </div>
            </div>
        </main>
    )
}
