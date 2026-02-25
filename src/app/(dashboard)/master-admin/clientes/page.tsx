'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchOrganizations, toggleOrganizationStatus, type OrganizationData } from '@/app/actions/master-admin'
import styles from '../page.module.css'
import TenantRegistrationModal from '@/components/modules/TenantRegistrationModal'
import EditTenantPlanModal from '@/components/modules/EditTenantPlanModal'
import { fetchPlans, SaasPlan } from '@/app/actions/plans'

export default function ClientesPage() {
    const [shops, setShops] = useState<OrganizationData[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingPlanTenant, setEditingPlanTenant] = useState<OrganizationData | null>(null)
    const [plans, setPlans] = useState<SaasPlan[]>([])

    const supabase = createClient()

    const loadData = async () => {
        const [orgsData, plansData] = await Promise.all([
            fetchOrganizations(),
            fetchPlans()
        ])
        setShops(orgsData)
        setPlans(plansData.filter(p => p.is_active))
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

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
            await loadData()
        } else {
            alert(res.message)
        }
        setActionLoading(null)
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando clientes...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.title}>👥 Gestão de Clientes</h1>
                    <p className={styles.subtitle}>Gerencie os Pet Shops e empresas da plataforma</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                    style={{ background: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                    + Novo Cliente
                </button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por nome ou subdomínio..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className={styles.statusFilters}>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'active' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        Ativos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${statusFilter === 'inactive' ? styles.active : ''}`}
                        onClick={() => setStatusFilter('inactive')}
                    >
                        Inativos
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
                            <th>Plano</th>
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
                                    <span className={styles.location}>{shop.subdomain}.mypetflow.com.br</span>
                                </td>
                                <td>
                                    <span className={styles.planBadge}>
                                        {shop.plan_name || 'Sem Plano'}
                                    </span>
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
                                            title="Alterar Plano SaaS"
                                            onClick={() => setEditingPlanTenant(shop)}
                                            style={{ color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)', marginRight: '0.5rem' }}
                                        >
                                            💎
                                        </button>
                                        <button
                                            className={styles.actionBtn}
                                            title={shop.is_active ? 'Desativar Empresa' : 'Ativar Empresa'}
                                            onClick={() => handleToggleStatus(shop.id, shop.is_active)}
                                            disabled={actionLoading === shop.id}
                                            style={{ color: shop.is_active ? '#e74c3c' : '#2ecc71', borderColor: shop.is_active ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)' }}
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
                    <p>Nenhum cliente encontrado.</p>
                </div>
            )}

            {showModal && (
                <TenantRegistrationModal
                    onClose={() => setShowModal(false)}
                    onSuccess={loadData}
                    plans={plans}
                />
            )}

            {editingPlanTenant && (
                <EditTenantPlanModal
                    tenant={editingPlanTenant}
                    plans={plans}
                    onClose={() => setEditingPlanTenant(null)}
                    onSuccess={loadData}
                />
            )}
        </div>
    )
}
