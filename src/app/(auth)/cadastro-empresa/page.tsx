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

                    <h1 className={styles.title} style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        Parceiro Sr. Pet Clube
                    </h1>

                    <p className={styles.description} style={{ maxWidth: '600px', margin: '0 auto' }}>
                        Transforme a gestão do seu Pet Shop, Clínica Veterinária ou Creche com o sistema mais prático do mercado.
                    </p>
                </section>

                {/* Form Section */}
                <section style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <RegisterOwnerForm />
                </section>
            </div>
        </main>
    )
}
