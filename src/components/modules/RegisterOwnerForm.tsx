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
        <div className={styles.registerCard}>
            <h2 className={styles.cardTitle}>Cadastro da Empresa</h2>
            <p className={styles.cardSubtitle}>Crie sua conta como Pet Shop, Clínica ou Creche.</p>

            <form onSubmit={handleSubmit} className={styles.formStack}>
                {/* Dados da Empresa */}
                <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
                    <h4 style={{ color: 'var(--color-sky-blue)', fontSize: '1.05rem', marginBottom: '1rem' }}>Dados do Negócio</h4>
                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label>Nome da Empresa</label>
                        <input name="orgName" type="text" required placeholder="Sr. Pet Clube" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Subdomínio Desejado</label>
                        <input name="subdomain" type="text" required placeholder="meupetshop" className={styles.input} />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-0.25rem', paddingLeft: '0.25rem' }}>O link do seu cliente será: nome.srpetclube.com.br</span>
                    </div>
                </div>

                {/* Dados do Proprietário */}
                <div style={{ paddingTop: '0.5rem' }}>
                    <h4 style={{ color: 'var(--color-coral)', fontSize: '1.05rem', marginBottom: '1rem' }}>Seus Dados</h4>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label>Nome Completo do Responsável</label>
                        <input name="fullName" type="text" required placeholder="Seu nome" className={styles.input} />
                    </div>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label>Telefone / Celular</label>
                        <input name="phone" type="tel" required placeholder="(11) 99999-9999" className={styles.input} />
                    </div>

                    <div className={styles.field} style={{ marginBottom: '1rem' }}>
                        <label>Email de Acesso</label>
                        <input name="email" type="email" required placeholder="seu@email.com" className={styles.input} />
                    </div>

                    <div className={styles.field}>
                        <label>Senha de Acesso</label>
                        <input name="password" type="password" required placeholder="Crie uma senha forte" className={styles.input} minLength={6} />
                    </div>
                </div>

                {msg && <p className={styles.errorMsg}>{msg}</p>}

                <button type="submit" className={styles.primaryButton} disabled={loading} style={{ marginTop: '1.5rem' }}>
                    {loading ? 'Criando sua empresa...' : 'Criar Conta da Empresa'}
                </button>
            </form>

            <div className={styles.loginDivider}>
                <span>Quer apenas agendar um serviço pro seu Pet?</span>
                <Link href="/cadastro" className={styles.textLink}>Cadastre-se como Tutor</Link>
            </div>

            <div className={styles.loginDivider} style={{ borderTop: 'none', paddingTop: 0 }}>
                <span>Já possui conta?</span>
                <Link href="/" className={styles.textLink}>Fazer Login</Link>
            </div>
        </div>
    )
}
