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
                        <Image src="/LOGO-02.png" alt="MyPet Flow" width={180} height={50} priority style={{ filter: 'brightness(0) invert(1)', margin: '0 auto', display: 'block' }} />
                        <p className={styles.subtitle} style={{ color: 'rgba(255,255,255,0.7)', marginTop: '1rem', textAlign: 'center' }}>
                            Encontre o endereço do seu Pet Shop
                        </p>
                    </div>

                    <div className={styles.formSection}>
                        <Suspense fallback={<div>Carregando...</div>}>
                            <ClientDomainForm />
                        </Suspense>
                    </div>

                    <div className={styles.footer} style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link href="/" style={{ color: 'var(--color-sky)', textDecoration: 'none', fontSize: '0.9rem' }}>
                            &larr; Voltar para o Início
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
