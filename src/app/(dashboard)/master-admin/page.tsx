'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchGlobalStats } from '@/app/actions/master-admin'
import styles from './page.module.css'

interface GlobalStats {
    organizations: number
    users: number
    pets: number
    appointments: number
    revenue: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<GlobalStats | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()
        const checkAuth = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser()
                
                if (authError) {
                    console.error('Auth error:', authError)
                    if (authError.status === 429) {
                        setError('Limite de requisições atingido. O Supabase bloqueou requisições por alguns minutos. Por favor, aguarde e tente novamente.')
                    } else {
                        setError(`Erro de Autenticação: ${authError.message}. Por favor, limpe seus cookies ou saia do sistema e entre novamente.`)
                    }
                    setLoading(false)
                    return
                }

                if (!user) {
                    setError('Sessão expirada ou não encontrada. Por favor, saia do sistema e faça login novamente.')
                    setLoading(false)
                    return
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profileError) {
                    console.error('Profile error:', profileError)
                    setError('Erro ao carregar perfil do usuário.')
                    setLoading(false)
                    return
                }

                if (!profile || profile.role !== 'superadmin') {
                    router.push('/owner')
                    return
                }

                const data = await fetchGlobalStats()
                setStats(data)
                setLoading(false)
            } catch (err: any) {
                console.error('Unexpected error in checkAuth:', err)
                setError('Ocorreu um erro inesperado ao carregar o dashboard.')
                setLoading(false)
            }
        }

        checkAuth()
    }, [router])

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando dashboard...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.loading}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-coral)', padding: '2rem', borderRadius: '16px', textAlign: 'center', maxWidth: '400px' }}>
                    <p style={{ color: 'var(--color-coral)', marginBottom: '1.5rem', fontWeight: 600 }}>{error}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{ background: 'var(--color-sky)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, border: 'none' }}
                        >
                            Tentar novamente
                        </button>
                        <button
                            onClick={async () => {
                                const supabase = createClient()
                                await supabase.auth.signOut()
                                router.push('/')
                            }}
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Sair do Sistema
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>⚡ Dashboard Master</h1>
                <p className={styles.subtitle}>Visão geral de todo o ecossistema MyPet Flow</p>
            </div>

            <div className={styles.analyticsGrid}>
                <div className={styles.analyticsCard}>
                    <div className={styles.cardIcon}>🏢</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats?.organizations}</span>
                        <span className={styles.cardLabel}>Tenants (Lojas)</span>
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <div className={styles.cardIcon}>👥</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats?.users}</span>
                        <span className={styles.cardLabel}>Usuários Totais</span>
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <div className={styles.cardIcon}>🐾</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats?.pets}</span>
                        <span className={styles.cardLabel}>Pets Cadastrados</span>
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <div className={styles.cardIcon}>📅</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats?.appointments}</span>
                        <span className={styles.cardLabel}>Agendamentos Realizados</span>
                    </div>
                </div>

                <div className={styles.analyticsCard}>
                    <div className={styles.cardIcon}>💰</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>R$ {stats?.revenue.toLocaleString()}</span>
                        <span className={styles.cardLabel}>Receita SaaS (Estimada)</span>
                    </div>
                </div>
            </div>

            <div className={styles.header} style={{ marginTop: '2rem' }}>
                <h2 className={styles.title} style={{ fontSize: '1.25rem' }}>🚀 Ações Rápidas</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <button
                    onClick={() => router.push('/master-admin/clientes')}
                    style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
                    <div style={{ fontWeight: 700 }}>Gerenciar Clientes</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ativar, desativar ou cadastrar novas lojas.</div>
                </button>

                <button
                    onClick={() => router.push('/owner')}
                    style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏪</div>
                    <div style={{ fontWeight: 700 }}>Acessar Unidade Própria</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ver o painel como dono de loja.</div>
                </button>
            </div>
        </div>
    )
}
