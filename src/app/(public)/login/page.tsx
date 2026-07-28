import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from '@/app/page.module.css'
import ClientDomainForm from './ClientDomainForm'

export default function TenantLookupPage() {
    return (
        <main className={styles.main}>
            {/* Efeitos visuais do dark theme padrao do login */}
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <Image src="/LOGO-02.png" alt="MyPet Flow" width={180} height={50} priority className={styles.logoImage} />
                        <p className={styles.subtitle} style={{ marginTop: '1rem', textAlign: 'center' }}>
                            Encontre o endereço do seu Pet Shop
                        </p>
                    </div>

                    <div className={styles.formSection}>
                        <Suspense fallback={<div>Carregando...</div>}>
                            <ClientDomainForm />
                        </Suspense>
                    </div>

                    <div className={styles.footer} style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link href="/" className={styles.backLink} style={{ color: 'var(--color-navy-light, var(--color-sky-dark, #008b7d))', fontWeight: 600 }}>
                            &larr; Voltar para o Início
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
