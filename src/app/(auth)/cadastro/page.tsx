'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import RegisterForm from '@/components/modules/RegisterForm'

export default function CadastroPage() {
    return (
        <main className={styles.main}>
            {/* Background gradient orbs */}
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                {/* Hero Section */}
                <section className={styles.hero}>
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
                    <h1 className={styles.title} style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                        MyPet Flow
                    </h1>
                    <p className={styles.description} style={{ maxWidth: '600px', margin: '0 auto' }}>
                        Portal exclusivo para tutores. Crie sua conta e acompanhe as atividades, fotos e agenda do seu pet.
                    </p>
                </section>

                {/* Form Section */}
                <section style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <RegisterForm />
                </section>

                <footer className={styles.footer} style={{ marginTop: '1rem' }}>
                    <p>
                        Já tem uma conta?{' '}
                        <Link href="/" style={{ color: 'var(--color-coral)', fontWeight: 600, textDecoration: 'none' }}>
                            Faça Login
                        </Link>
                    </p>
                </footer>
            </div>
        </main>
    )
}
