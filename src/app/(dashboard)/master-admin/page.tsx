'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchOrganizations, toggleOrganizationStatus, type OrganizationData } from '@/app/actions/master-admin'
import styles from './page.module.css'

interface Analytics {
    totalShops: number
    activeShops: number
    // Campos fictícios provisórios
    totalRevenue: number
    totalServices: number
    growth: number
}

export default function AdminPage() {
    const [shops, setShops] = useState<OrganizationData[]>([])
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const loadData = async () => {
        const data = await fetchOrganizations()
        setShops(data)

        // Calcular analytics base
        const total = data.length
        const active = data.filter(o => o.is_active).length

        setAnalytics({
            totalShops: total,
            activeShops: active,
            totalRevenue: 0, // Implementar query real posteriormente se necessário  
            totalServices: 0, // Implementar query real posteriormente se necessário
            growth: 0
        })
    }

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, org_id')
                .eq('id', user.id)
                .single()

            // Apenas superadmins (que tem null ou sem org específica se configurado) acessam
            // Para garantir: verifique console de logs pra role 'superadmin'
            if (!profile || profile.role !== 'superadmin') {
                router.push('/owner')
                return
            }

            await loadData()
            setLoading(false)
        }

        checkAuth()
    }, [supabase, router])

    const filteredShops = shops.filter(shop => {
        const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.subdomain.toLowerCase().includes(searchTerm.toLowerCase())

        const activeFilter = statusFilter === 'all'
            ? true
            : statusFilter === 'active' ? shop.is_active : !shop.is_active

        return matchesSearch && activeFilter
    })

    const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
        if (!confirm(`Deseja realmente ${currentStatus ? 'desativar' : 'ativar'} esta empresa?`)) return

        setActionLoading(orgId)
        const res = await toggleOrganizationStatus(orgId, currentStatus)
        if (res.success) {
            await loadData() // refresh local state
        } else {
            alert(res.message)
        }
        setActionLoading(null)
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando painel...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>🏢 Painel Administrativo</h1>
                    <p className={styles.subtitle}>Gestão de tenants SaaS</p>
                </div>
            </div>

            {/* Analytics Cards */}
            {analytics && (
                <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                        <div className={styles.cardIcon}>🏪</div>
                        <div className={styles.cardContent}>
                            <span className={styles.cardValue}>{analytics.totalShops}</span>
                            <span className={styles.cardLabel}>Empresas Cadastradas</span>
                        </div>
                    </div>
                    <div className={styles.analyticsCard}>
                        <div className={styles.cardIcon}>✅</div>
                        <div className={styles.cardContent}>
                            <span className={styles.cardValue}>{analytics.activeShops}</span>
                            <span className={styles.cardLabel}>Ativas</span>
                        </div>
                    </div>
                    {/* Placeholder metrics */}
                    <div className={styles.analyticsCard}>
                        <div className={styles.cardIcon}>👥</div>
                        <div className={styles.cardContent}>
                            <span className={styles.cardValue}>
                                {shops.reduce((acc, curr) => acc + curr.total_users, 0)}
                            </span>
                            <span className={styles.cardLabel}>Contas Criadas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="🔍 Buscar empresa..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className={styles.statusFilters}>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Todas
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'active' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        Ativas
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'inactive' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('inactive')}
                    >
                        Inativas
                    </button>
                </div>
            </div>

            {/* Shops Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Pet Shop / Empresa</th>
                            <th>Subdomínio</th>
                            <th>Status</th>
                            <th>Usuários</th>
                            <th>Criado Em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShops.map((shop) => (
                            <tr key={shop.id}>
                                <td>
                                    <div className={styles.shopInfo}>
                                        <span className={styles.shopName}>{shop.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.location}>{shop.subdomain}.srpetclube.com.br</span>
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${shop.is_active ? styles.active : styles.suspended}`}>
                                        {shop.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.services}>{shop.total_users}</span>
                                </td>
                                <td>
                                    <span className={styles.location}>{new Date(shop.created_at).toLocaleDateString()}</span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.actionBtn}
                                            title={shop.is_active ? 'Desativar Empresa' : 'Ativar Empresa'}
                                            onClick={() => handleToggleStatus(shop.id, shop.is_active)}
                                            disabled={actionLoading === shop.id}
                                            style={{ filter: shop.is_active ? 'hue-rotate(150deg)' : 'none' }} // gambiarra CSS pro botao mudar de cor
                                        >
                                            {actionLoading === shop.id ? '⏳' : shop.is_active ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredShops.length === 0 && (
                <div className={styles.emptyState}>
                    <span>🔍</span>
                    <p>Nenhuma empresa encontrada.</p>
                </div>
            )}
        </div>
    )
}
