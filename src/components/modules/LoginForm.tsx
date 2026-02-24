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

            // 2. Get User Profile/Role with Organization Subdomain
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, org_id, organizations(subdomain)')
                .eq('id', user.id)
                .single()

            if (!profile) throw new Error('Perfil não encontrado.')

            const role = profile.role
            const orgSubdomain = (profile.organizations as any)?.subdomain

            console.log('--- LOGIN DEBUG ---')
            console.log('User ID:', user.id)
            console.log('Profile Role:', role)
            console.log('Org Subdomain:', orgSubdomain)

            // Determinar rota base
            let targetPath = '/owner'
            if (role === 'superadmin') targetPath = '/master-admin'
            else if (role === 'staff') targetPath = '/staff'
            else if (role === 'customer') targetPath = '/tutor'

            console.log('Target Path:', targetPath)

            // Lógica de Redirecionamento Inteligente de URL
            const currentHost = window.location.host
            const isLocalOrVercel = currentHost.includes('localhost') || currentHost.includes('vercel.app')

            if (role === 'superadmin') {
                // Superadmin fica no domínio que estiver (geralmente o principal)
                window.location.href = targetPath
            } else if (orgSubdomain) {
                if (isLocalOrVercel) {
                    // No Vercel/Local, mantemos o domínio mas passamos o org via query
                    router.push(`${targetPath}?org=${orgSubdomain}`)
                } else {
                    // Em produção, forçamos o subdomínio correto se necessário
                    const [sub] = currentHost.split('.')
                    if (sub !== orgSubdomain) {
                        window.location.href = `https://${orgSubdomain}.mypetflow.com.br${targetPath}`
                    } else {
                        router.push(targetPath)
                    }
                }
            } else {
                // Fallback sem organização vinculada (estranho para admin/staff)
                router.push(targetPath)
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
