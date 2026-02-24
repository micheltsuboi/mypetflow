'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from '@/app/(auth)/cadastro/page.module.css'
import RegisterOwnerForm from '@/components/modules/RegisterOwnerForm'

export default function CadastroEmpresaPage() {
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
