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
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            if (!profile || profile.role !== 'superadmin') {
                router.push('/owner')
                return
            }

            const data = await fetchGlobalStats()
            setStats(data)
            setLoading(false)
        }

        checkAuth()
    }, [supabase, router])

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando dashboard...</p>
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
