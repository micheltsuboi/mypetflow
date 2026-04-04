import { unstable_cache } from 'next/cache'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import styles from './page.module.css'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/modules/LoginForm'
import LandingPage from '@/components/public/LandingPage'

const getCachedOrg = unstable_cache(
    async (sub: string) => {
        const adminSupabase = createAdminClient()
        const { data } = await adminSupabase
            .from('organizations')
            .select('id, name, is_active')
            .eq('subdomain', sub)
            .maybeSingle()
        return data
    },
    ['org-subdomain-lookup'],
    { revalidate: 300 } // 5 minutos minimizam requisições SQL ao máximo enquanto mantêm frescor
)

export default async function LoginPage() {
    const headerStack = await headers()
    const host = headerStack.get('host') || ''
    const supabase = await createClient()

    // --- NOVO: Redirecionamento Automático para usuários logados ---
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, org_id')
            .eq('id', user.id)
            .single()

        if (profile) {
            let target = '/owner'
            if (profile.role === 'customer') target = '/tutor'
            else if (profile.role === 'staff') target = '/owner'
            else if (profile.role === 'superadmin' && !profile.org_id) target = '/master-admin'
            else if (profile.role === 'superadmin' && profile.org_id) target = '/owner'
            
            // Se estivermos em um subdomínio, garantir que redirecionamos para o caminho relativo,
            // e o middleware cuidará do resto se houver troca de tenant necessária.
            redirect(target)
        }
    }

    // Detectar subdomínio
    let subdomain = ''
    const isRootHost =
        host === 'localhost:3000' ||
        host === '127.0.0.1:3000' ||
        host === 'mypetflow.com.br' ||
        host === 'www.mypetflow.com.br' ||
        host.includes('vercel.app') && host.split('.').length === 3 

    if (!isRootHost) {
        subdomain = host.split('.')[0]
    }

    // Se estiver na raiz e NÃO estiver logado (já passou o check acima), renderiza a Landing Page
    if (!subdomain || subdomain === 'www') {
        return <LandingPage />
    }

    // A partir daqui, TEM subdomínio! Tratar página de Login do Inquilino SaaS com CACHE da Vercel
    const org = await getCachedOrg(subdomain)

    // Se a organização não existir, pode ser um subdomínio inválido ou preview do Vercel
    if (!org) {
        return <LandingPage />
    }

    // Se estiver inativo
    if (org.is_active === false) {
        return (
            <main className={styles.main}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
                <div className={styles.container}>
                    <div className={styles.card} style={{ textAlign: 'center' }}>
                        <div className={styles.logo}>
                            <Image src="/LOGO-02.png" alt="MyPet Flow" width={240} height={100} className={styles.logoImage} priority style={{ filter: 'brightness(0) invert(1)' }} />
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

    // Se o subdomínio for válido e o tenant estiver ativo, mostra o Módulo de Login
    return (
        <main className={styles.main}>
            {/* Background gradient orbs */}
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                <div className={styles.card}>
                    {/* Logo (forçando o oficial) */}
                    <div className={styles.logo}>
                        <Image
                            src="/LOGO-02.png"
                            alt="MyPet Flow"
                            width={240}
                            height={100}
                            className={styles.logoImage}
                            priority
                            style={{ filter: 'brightness(0) invert(1)', width: '240px', objectFit: 'contain' }}
                        />
                    </div>

                    <p className={styles.subtitle}>Acesso a <strong>{org.name}</strong></p>

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

                        <Link href="/" className={styles.backLink} style={{ color: 'var(--color-sky)' }}>
                            &larr; Voltar para a Página Principal
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
