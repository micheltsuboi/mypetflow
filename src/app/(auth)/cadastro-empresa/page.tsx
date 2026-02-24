import Image from 'next/image'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import styles from '@/app/(auth)/cadastro/page.module.css'
import RegisterOwnerForm from '@/components/modules/RegisterOwnerForm'
import Link from 'next/link'

export default async function CadastroEmpresaPage() {
    const headerStack = await headers()
    const host = headerStack.get('host') || ''
    const supabaseAdmin = createAdminClient()

    // Detectar subdomínio
    let subdomain = ''
    if (host.includes('localhost') || host.includes('vercel.app')) {
        subdomain = ''
    } else {
        subdomain = host.split('.')[0]
    }

    // Se houver um subdomínio, validar se a empresa está ativa antes de deixar cadastrar outra?
    // Na verdade, se o subdomínio está INATIVO, bloqueamos TUDO naquela rota.
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
                        <div className={styles.registerCard} style={{ textAlign: 'center' }}>
                            <div className={styles.logoContainer}>
                                <Image src="/logo.png" alt="MyPet Flow" width={240} height={100} className={styles.logoImage} priority />
                            </div>
                            <h1 className={styles.title}>Acesso Suspenso</h1>
                            <p className={styles.cardSubtitle}>
                                O acesso para <strong>{org.name}</strong> está temporariamente indisponível.
                            </p>
                            <div className={styles.error} style={{ margin: '1.5rem 0', background: 'rgba(232, 130, 106, 0.1)', color: 'var(--color-coral)', border: '1px solid var(--color-coral)', padding: '1rem', borderRadius: '0.5rem' }}>
                                Para regularizar seu acesso ou obter mais informações, entre em contato com o suporte da MyPet Flow.
                            </div>
                            <footer className={styles.loginDivider} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                <Link href="mailto:contato@mypetflow.com.br" className={styles.textLink} style={{ color: 'var(--color-sky)', textDecoration: 'none', fontWeight: 600 }}>
                                    contato@mypetflow.com.br
                                </Link>
                            </footer>
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
                        Parceiro MyPet Flow
                    </h1>

                    <p className={styles.cardSubtitle} style={{ marginBottom: '1.5rem' }}>
                        A plataforma completa para seu negócio pet
                    </p>

                    <RegisterOwnerForm />
                </div>
            </div>
        </main>
    )
}
