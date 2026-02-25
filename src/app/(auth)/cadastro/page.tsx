import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import styles from './page.module.css'
import RegisterForm from '@/components/modules/RegisterForm'

export default async function CadastroPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string }>;
}) {
    const params = await searchParams
    const headerStack = await headers()
    const host = headerStack.get('host') || ''
    const supabaseAdmin = createAdminClient()

    // Lógica inteligente de detecção:
    // 1. Tentar pegar por parâmetro ?org= (útil para Vercel sem wildcard)
    // 2. Tentar pegar por subdomínio real (útil para o domínio final)
    let subdomain = params.org || ''

    if (!subdomain) {
        if (host.includes('localhost') || host.includes('vercel.app')) {
            subdomain = ''
        } else {
            subdomain = host.split('.')[0]
        }
    }

    // Buscar dados da organização para o branding
    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id, name, is_active')
        .eq('subdomain', subdomain)
        .maybeSingle()

    // Se a empresa existir mas estiver desativada, bloqueamos o acesso com mensagem amigável
    if (org && org.is_active === false) {
        return (
            <main className={styles.main}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
                <div className={styles.container}>
                    <div className={styles.registerCard} style={{ textAlign: 'center' }}>
                        <div className={styles.logoContainer}>
                            <Image src="/logo.png" alt="MyPet Flow" width={240} height={100} className={styles.logoImage} priority />
                        </div>
                        <h1 className={styles.title}>Acesso Suspenso</h1>
                        <p className={styles.cardSubtitle}>
                            O acesso para <strong>{org.name}</strong> está temporariamente indisponível.
                        </p>
                        <div className={styles.error} style={{ margin: '1.5rem 0', background: 'rgba(232, 130, 106, 0.1)', color: 'var(--color-coral)', border: '1px solid var(--color-coral)' }}>
                            Para regularizar seu acesso ou obter mais informações, entre em contato com o suporte da MyPet Flow.
                        </div>
                        <footer className={styles.loginDivider}>
                            <Link href="mailto:contato@mypetflow.com.br" className={styles.textLink}>
                                contato@mypetflow.com.br
                            </Link>
                        </footer>
                    </div>
                </div>
            </main>
        )
    }

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

                    <RegisterForm orgId={org?.id} />

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
