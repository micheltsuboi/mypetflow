'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/page.module.css'

export default function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlError = searchParams.get('error')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(urlError || '')

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
                    required
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
                    required
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
    )
}
