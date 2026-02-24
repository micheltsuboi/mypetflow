'use client'

import { useState } from 'react'
import { registerOwner } from '@/app/actions/register-owner'
import styles from '@/app/page.module.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterOwnerForm() {
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [isSuccess, setIsSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMsg('')

        const formData = new FormData(e.currentTarget)
        const res = await registerOwner({ message: '', success: false }, formData)

        if (res.success) {
            setIsSuccess(true)
            setMsg('Empresa cadastrada com sucesso! Redirecionando para login...')
            setTimeout(() => {
                router.push('/')
            }, 3000)
        } else {
            setMsg(res.message)
        }
        setLoading(false)
    }

    if (isSuccess) {
        return (
            <div className={styles.successCard}>
                <h3>{msg}</h3>
                <Link href="/" className={styles.button}>Ir para Login</Link>
            </div>
        )
    }

    return (
        <>
            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Dados da Empresa */}
                <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>Nome da Empresa</label>
                        <input name="orgName" type="text" required placeholder="MyPet Flow" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Subdomínio Desejado</label>
                        <input name="subdomain" type="text" required placeholder="meupetshop" className={styles.input} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>O link do seu cliente será: <strong>nome</strong>.mypetflow.com.br</span>
                    </div>
                </div>

                {/* Dados do Proprietário */}
                <div style={{ paddingTop: '0.5rem' }}>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>Responsável</label>
                        <input name="fullName" type="text" required placeholder="Seu nome" className={styles.input} />
                    </div>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>Telefone / WhatsApp</label>
                        <input name="phone" type="tel" required placeholder="(11) 99999-9999" className={styles.input} />
                    </div>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>Email de Acesso</label>
                        <input name="email" type="email" required placeholder="seu@email.com" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Senha de Acesso</label>
                        <input name="password" type="password" required placeholder="Crie uma senha forte" className={styles.input} minLength={6} />
                    </div>
                </div>

                {msg && <div className={styles.error}>{msg}</div>}

                <button type="submit" className={styles.button} disabled={loading} style={{ marginTop: '0.5rem' }}>
                    {loading ? (
                        <>
                            <span className={styles.spinner} />
                            Criando conta...
                        </>
                    ) : (
                        'Criar Conta da Empresa'
                    )}
                </button>
            </form>

            <div className={styles.divider}>
                <span>ou</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <Link href="/" className={styles.backLink}>
                    Já tem uma conta? <strong>Fazer Login</strong>
                </Link>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', width: '80%', margin: '0.5rem 0' }}></div>

                <Link href="/cadastro" className={styles.backLink} style={{ color: 'var(--color-sky)' }}>
                    É um Tutor? <strong>Agende um serviço</strong>
                </Link>
            </div>
        </>
    )
}
