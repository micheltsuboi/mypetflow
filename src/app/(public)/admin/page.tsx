import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from '@/app/page.module.css'
import LoginForm from '@/components/modules/LoginForm'

export default function AdminLoginPage() {
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
                            src="/LOGO-02.png"
                            alt="MyPet Flow"
                            width={240}
                            height={100}
                            className={styles.logoImage}
                            priority
                            style={{ filter: 'brightness(0) invert(1)', width: '240px', objectFit: 'contain' }}
                        />
                    </div>

                    <p className={styles.subtitle}>Acesso Administrativo / Global Server</p>

                    <Suspense fallback={<div className={styles.spinner} />}>
                        <LoginForm />
                    </Suspense>

                    <div className={styles.divider}>
                        <span>ou</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                        <Link href="/" className={styles.backLink} style={{ color: 'var(--color-sky)' }}>
                            &larr; Voltar para a Página Principal
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
