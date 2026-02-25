'use client'

import { useState } from 'react'
import { registerClient } from '@/app/actions/auth'
import styles from '@/app/page.module.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { maskPhone } from '@/utils/masks'


export default function RegisterForm({ orgId }: { orgId?: string }) {
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [isSuccess, setIsSuccess] = useState(false)
    const [phone, setPhone] = useState('')

    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMsg('')

        const formData = new FormData(e.currentTarget)
        const res = await registerClient({ message: '', success: false }, formData) // server action

        if (res.success) {
            setIsSuccess(true)
            setMsg('Cadastro realizado com sucesso! Redirecionando para login...')
            router.push('/')
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
        <form onSubmit={handleSubmit} className={styles.form}>
            {/* Campo oculto para garantir vínculo com a empresa no Vercel */}
            <input type="hidden" name="org_id" value={orgId || ''} />

            <div className={styles.field}>
                <label className={styles.label}>Nome Completo</label>
                <input name="name" type="text" required placeholder="Seu nome" className={styles.input} />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input name="email" type="email" required placeholder="seu@email.com" className={styles.input} />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>Telefone / WhatsApp</label>
                <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    className={styles.input}
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    maxLength={15}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>Senha</label>
                <input name="password" type="password" required placeholder="Crie uma senha" className={styles.input} minLength={6} />
            </div>

            {msg && <p className={styles.error}>{msg}</p>}

            <button type="submit" className={styles.button} disabled={loading}>
                {loading ? (
                    <>
                        <span className={styles.spinner} />
                        Criando conta...
                    </>
                ) : (
                    'Cadastrar'
                )}
            </button>
        </form>
    )
}
