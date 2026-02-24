'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()

            // 1. Sign In
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) throw signInError

            // 2. Get User Profile/Role
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Erro ao recuperar usuário.')

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile) throw new Error('Perfil não encontrado.')

            // 3. Redirect based on Role
            const role = profile.role
            console.log('--- LOGIN DEBUG ---')
            console.log('User ID:', user.id)
            console.log('Profile Role:', role)

            if (role === 'superadmin') {
                console.log('Action: Redirecting to /master-admin (Full Refresh)')
                window.location.href = '/master-admin'
            } else if (role === 'admin') {
                console.log('Action: Redirecting to /owner')
                router.push('/owner')
            } else if (role === 'staff') {
                console.log('Action: Redirecting to /staff')
                router.push('/staff')
            } else if (role === 'customer') {
                console.log('Action: Redirecting to /tutor')
                router.push('/tutor')
            } else {
                console.log('Action: Fallback redirect to /owner (Role unknown:', role, ')')
                router.push('/owner')
            }
            console.log('-------------------')

        } catch (error) {
            console.error('Login error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.'

            setError(errorMessage.includes('Invalid login credentials')
                ? 'Email ou senha incorretos.'
                : 'Ocorreu um erro ao fazer login.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className={styles.main}>
            {/* Background gradient orbs */}
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />

            <div className={styles.container}>
                <div className={styles.card}>
                    {/* Logo */}
                    <div className={styles.logo}>
                        <Image
                            src="/logo.png"
                            alt="MyPet Flow"
                            width={240}
                            height={100}
                            className={styles.logoImage}
                        />
                    </div>

                    <p className={styles.subtitle}>Entre na sua conta (v1.1)</p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

                        <div className={styles.field}>
                            <label htmlFor="email" className={styles.label}>Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className={styles.input}
                                autoComplete="email"
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="password" className={styles.label}>Senha</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={styles.input}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.button}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner} />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>ou</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                        <Link href="/cadastro" className={styles.backLink}>
                            Não tem uma conta de tutor? <strong>Cadastre-se aqui</strong>
                        </Link>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', width: '80%', margin: '0.5rem 0' }}></div>

                        <Link href="/cadastro-empresa" className={styles.backLink} style={{ color: 'var(--color-sky-blue)' }}>
                            Tem um Pet Shop? <strong>Cadastre sua empresa</strong>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
