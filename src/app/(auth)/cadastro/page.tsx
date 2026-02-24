'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import RegisterForm from '@/components/modules/RegisterForm'

export default function CadastroPage() {
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
                        Portal do Tutor
                    </h1>

                    <p className={styles.cardSubtitle} style={{ marginBottom: '1.5rem' }}>
                        Crie sua conta para acompanhar seu pet
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
