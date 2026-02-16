'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import RegisterForm from '@/components/modules/RegisterForm'

export default function Home() {
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

        {/* Registration Form (replaces Card Grid) */}
        <section style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <RegisterForm />
        </section>

        <footer className={styles.footer}>
          <p>© 2026 Sr. Pet Clube. Todos os direitos reservados.</p>
          <div style={{ marginTop: '0.5rem', opacity: 0.5, fontSize: '0.8em' }}>
            <Link href="/master-admin" style={{ color: 'inherit', textDecoration: 'none' }}>Admin Master</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
