import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import styles from './page.module.css'
import LoginForm from '@/components/modules/LoginForm'

export default async function LoginPage() {
    const headerStack = await headers()
    const host = headerStack.get('host') || ''
    const supabaseAdmin = createAdminClient()

    // Detectar subdomínio
    let subdomain = ''
    if (host.includes('localhost') || host.includes('vercel.app')) {
        // No local/vercel sem subdomínio específico, não bloqueamos a página principal
        subdomain = ''
    } else {
        subdomain = host.split('.')[0]
    }

    // Se houver um subdomínio, validar se a empresa está ativa
    if (subdomain && subdomain !== 'www') {
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('id, name, is_active')
            .eq('subdomain', subdomain)
            .maybeSingle()

        if (org && org.is_active === false) {
            return (
                <main className={styles.main}>
                    <div className={styles.gradientOrb1} />
                    <div className={styles.gradientOrb2} />
                    <div className={styles.container}>
                        <div className={styles.card} style={{ textAlign: 'center' }}>
                            <div className={styles.logo}>
                                <Image src="/logo.png" alt="MyPet Flow" width={240} height={100} className={styles.logoImage} priority />
                            </div>
                            <h1 className={styles.title} style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Acesso Suspenso</h1>
                            <p className={styles.subtitle}>
                                O acesso para <strong>{org.name}</strong> está temporariamente indisponível.
                            </p>
                            <div className={styles.error} style={{ margin: '1.5rem 0', background: 'rgba(232, 130, 106, 0.1)', color: 'var(--color-coral)', border: '1px solid var(--color-coral)' }}>
                                Para regularizar seu acesso ou obter mais informações, entre em contato com o suporte da MyPet Flow.
                            </div>
                            <div className={styles.quickAccess} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                <Link href="mailto:contato@mypetflow.com.br" className={styles.textLink} style={{ color: 'var(--color-sky)', textDecoration: 'none', fontWeight: 600 }}>
                                    contato@mypetflow.com.br
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            )
        }
    }

    return (
        <main className={styles.main}>
            {/* Background gradient orbs */}
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                <div className={styles.card}>
                    {/* Logo */}
                    <div className={styles.logo}>
                        <Image
                            src="/logo.png"
                            alt="MyPet Flow"
                            width={240}
                            height={100}
                            className={styles.logoImage}
                            priority
                        />
                    </div>

                    <p className={styles.subtitle}>Entre na sua conta (v1.1)</p>

                    <Suspense fallback={<div className={styles.spinner} />}>
                        <LoginForm />
                    </Suspense>

                    <div className={styles.divider}>
                        <span>ou</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                        <Link href="/cadastro" className={styles.backLink}>
                            Não tem uma conta de tutor? <strong>Cadastre-se aqui</strong>
                        </Link>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', width: '80%', margin: '0.5rem 0' }}></div>

                        <Link href="/cadastro-empresa" className={styles.backLink} style={{ color: 'var(--color-sky)' }}>
                            Tem um Pet Shop? <strong>Cadastre sua empresa</strong>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
