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
                            alt="Sr. Pet Clube"
                            width={220}
                            height={220}
                            className={styles.logoImage}
                            priority
                        />
                    </div>

                    <p className={styles.subtitle}>
                        A Petshop do seu melhor amigo
                    </p>

                    <p className={styles.description}>
                        Cadastre-se para agendar banho, tosa, hotel e creche para seu pet.
                    </p>
                </section>

                {/* Form Section */}
                <section style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <RegisterForm />
                </section>

                <footer className={styles.footer} style={{ marginTop: '1rem' }}>
                    <p>
                        Já tem uma conta?{' '}
                        <Link href="/" style={{ color: 'var(--color-coral, #E8826A)', fontWeight: 600, textDecoration: 'none' }}>
                            Faça Login
                        </Link>
                    </p>
                </footer>
            </div>
        </main>
    )
}
