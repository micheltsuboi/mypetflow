'use client'

import { useState, useEffect, useCallback, useActionState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import {
    createServicePackage,
    updateServicePackage,
    deleteServicePackage,
    togglePackageStatus,
    addPackageItem,
    deletePackageItem,
    cancelCustomerPackage,
    pauseCustomerPackage,
    reschedulePackageSession,
    markSessionDone
} from '@/app/actions/package'
import PlanGuard from '@/components/modules/PlanGuard'
import PaymentManager from '@/components/finance/PaymentManager'

interface Service {
    id: string
    name: string
    category: string
    base_price: number
}

interface PackageItem {
    id: string
    service_id: string
    quantity: number
    services: Service
}

interface ServicePackage {
    id: string
    name: string
    description: string | null
    total_price: number
    validity_days: number | null
    validity_type: 'weekly' | 'monthly' | 'unlimited'
    validity_weeks: number | null
    auto_renew: boolean
    is_active: boolean
    package_items: PackageItem[]
}

interface PackageSession {
    id: string
    service_id: string
    period_start: string
    period_end: string
    scheduled_at: string | null
    status: 'pending' | 'scheduled' | 'done' | 'missed' | 'rescheduled'
    appointment_id: string | null
    services: { id: string, name: string }
    appointments?: { id: string, scheduled_at: string, status: string } | null
}

interface CustomerPackage {
    id: string
    customer_id: string
    pet_id: string | null
    package_id: string
    purchased_at: string
    period_start: string | null
    period_end: string | null
    preferred_day_of_week: number | null
    preferred_time: string | null
    is_active: boolean
    paused: boolean
    renewal_count: number
    customers: { name: string }
    pets: { name: string } | null
    service_packages: { name: string, validity_type: string, validity_weeks: number | null }
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente',
    scheduled: 'Agendado',
    done: 'Realizado',
    missed: 'Não realizado',
    rescheduled: 'Reagendado'
}
const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    scheduled: '#3b82f6',
    done: '#10b981',
    missed: '#ef4444',
    rescheduled: '#8b5cf6'
}

const initialState = { message: '', success: false }

export default function PackagesPage() {
    const supabase = createClient()
    const [packages, setPackages] = useState<ServicePackage[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([])
    const [selectedCpSessions, setSelectedCpSessions] = useState<PackageSession[]>([])
    const [selectedCp, setSelectedCp] = useState<CustomerPackage | null>(null)
    const [tab, setTab] = useState<'templates' | 'contratos'>('templates')

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
    const [showSessionsModal, setShowSessionsModal] = useState(false)
    const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null)
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleTime, setRescheduleTime] = useState('')

    // Form Action States
    const [createState, createAction, isCreatePending] = useActionState(createServicePackage, initialState)
    const [updateState, updateAction, isUpdatePending] = useActionState(updateServicePackage, initialState)

    // Add service to package state
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [serviceQuantity, setServiceQuantity] = useState(1)
    const [addingService, setAddingService] = useState(false)

    const formatCategory = (category: string) => {
        if (!category) return ''
        const mapping: Record<string, string> = {
            'creche': 'Creche', 'hotel': 'Hospedagem',
            'banho_tosa': 'Banho e Tosa', 'hospedagem': 'Hospedagem'
        }
        if (mapping[category.toLowerCase()]) return mapping[category.toLowerCase()]
        return category.replace(/_/g, ' ').split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            const [packagesRes, servicesRes, cpRes] = await Promise.all([
                supabase.from('service_packages').select(`
                    *, package_items(id, service_id, quantity, services(id, name, category, base_price))
                `).eq('org_id', profile.org_id).eq('is_subscription', false).order('created_at', { ascending: false }),
                supabase.from('services').select('id, name, category, base_price')
                    .eq('org_id', profile.org_id).eq('is_active', true).order('name'),
                supabase.from('customer_packages').select(`
                    *, customers(name), pets(name), service_packages(name, validity_type, validity_weeks)
                `).eq('org_id', profile.org_id).eq('is_active', true).eq('is_subscription', false)
                    .order('purchased_at', { ascending: false }).limit(100)
            ])

            if (packagesRes.data) setPackages(packagesRes.data as ServicePackage[])
            if (servicesRes.data) setServices(servicesRes.data)
            if (cpRes.data) setCustomerPackages(cpRes.data as CustomerPackage[])
        } catch (error) {
            console.error(error)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        if (createState.success || updateState.success) {
            setShowModal(false)
            fetchData()
            alert(createState.message || updateState.message)
        } else if (createState.message || updateState.message) {
            alert(createState.message || updateState.message)
        }
    }, [createState, updateState, fetchData])

    const openSessions = async (cp: CustomerPackage) => {
        setSelectedCp(cp)
        const { data } = await supabase
            .from('package_sessions')
            .select('*, services(id, name), appointments(id, scheduled_at, status)')
            .eq('customer_package_id', cp.id)
            .order('period_start', { ascending: false })
            .order('scheduled_at', { ascending: true })

        setSelectedCpSessions((data || []) as PackageSession[])
        setShowSessionsModal(true)
    }

    const handleReschedule = async (session: PackageSession) => {
        if (!rescheduleDate || !rescheduleTime) {
            alert('Selecione data e hora para reagendar.')
            return
        }
        const newTs = new Date(`${rescheduleDate}T${rescheduleTime}:00-03:00`).toISOString()
        const res = await reschedulePackageSession(session.id, newTs, true,
            selectedCp?.pet_id || undefined,
            undefined,
            session.service_id
        )
        alert(res.message)
        if (res.success && selectedCp) {
            setRescheduleSessionId(null)
            await openSessions(selectedCp)
        }
    }

    const handleMarkDone = async (session: PackageSession) => {
        const isDone = session.status !== 'done'
        const res = await markSessionDone(session.id, isDone)
        if (res.success && selectedCp) {
            await openSessions(selectedCp)
        } else alert(res.message)
    }

    const handleEdit = (pkg: ServicePackage) => {
        setSelectedPackage(pkg)
        setIsEditing(true)
        setShowModal(true)
    }

    const handleCreate = () => {
        setSelectedPackage(null)
        setIsEditing(false)
        setShowModal(true)
    }

    const handleDelete = async () => {
        if (!selectedPackage) return
        if (confirm(`Tem certeza que deseja excluir o pacote "${selectedPackage.name}"?`)) {
            const res = await deleteServicePackage(selectedPackage.id)
            if (res.success) { setShowModal(false); fetchData(); alert(res.message) }
            else alert(res.message)
        }
    }

    const handleToggleStatus = async (pkg: ServicePackage) => {
        const res = await togglePackageStatus(pkg.id, !pkg.is_active)
        if (res.success) fetchData()
        else alert(res.message)
    }

    const handleAddService = async () => {
        if (!selectedPackage || !selectedServiceId) return
        setAddingService(true)
        const res = await addPackageItem(selectedPackage.id, selectedServiceId, serviceQuantity)
        if (res.success) {
            const { data } = await supabase.from('service_packages').select(`
                *, package_items(id, service_id, quantity, services(id, name, category, base_price))
            `).eq('id', selectedPackage.id).single()
            if (data) { setSelectedPackage(data as ServicePackage); setSelectedServiceId(''); setServiceQuantity(1) }
            fetchData()
        } else alert(res.message)
        setAddingService(false)
    }

    const handleRemoveService = async (itemId: string) => {
        if (!confirm('Remover serviço do pacote?')) return
        const res = await deletePackageItem(itemId)
        if (res.success && selectedPackage) {
            const { data } = await supabase.from('service_packages').select(`
                *, package_items(id, service_id, quantity, services(id, name, category, base_price))
            `).eq('id', selectedPackage.id).single()
            if (data) setSelectedPackage(data as ServicePackage)
            fetchData()
        }
    }

    const validityLabel = (pkg: ServicePackage) => {
        if (pkg.validity_type === 'weekly') {
            const weeks = (pkg as any).validity_weeks || 1
            return weeks === 1 ? '📆 Renovação Semanal' : `📆 Renovação a cada ${weeks} semanas`
        }
        return '∞ Sem expiração'
    }

    return (
        <PlanGuard requiredModule="pacotes">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <Link href="/owner" style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.9rem', textDecoration: 'none' }}>← Voltar</Link>
                        <h1 className={styles.title}>📦 Pacotes de Serviços</h1>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>
                            Crie pacotes com renovação semanal ou mensal. Os serviços são agendados automaticamente quando configurados.
                        </p>
                    </div>
                    {tab === 'templates' && (
                        <button className={styles.actionButton} onClick={handleCreate}>+ Novo Pacote</button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setTab('templates')}
                        style={{ 
                            padding: '0.5rem 1rem', 
                            border: 'none', 
                            borderRadius: '8px 8px 0 0', 
                            background: tab === 'templates' ? 'var(--primary)' : 'transparent', 
                            color: tab === 'templates' ? 'var(--text-primary)' : 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            fontWeight: 700,
                            border: tab === 'templates' ? '1px solid var(--border)' : 'none',
                            borderBottom: 'none'
                        }}
                    >
                        📦 Templates de Pacotes
                    </button>
                    <button
                        onClick={() => setTab('contratos')}
                        style={{ 
                            padding: '0.5rem 1rem', 
                            border: 'none', 
                            borderRadius: '8px 8px 0 0', 
                            background: tab === 'contratos' ? 'var(--primary)' : 'transparent', 
                            color: tab === 'contratos' ? 'var(--text-primary)' : 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            fontWeight: 700,
                            border: tab === 'contratos' ? '1px solid var(--border)' : 'none',
                            borderBottom: 'none'
                        }}
                    >
                        📋 Contratos Ativos ({customerPackages.length})
                    </button>
                </div>

                {/* TEMPLATES DE PACOTES */}
                {tab === 'templates' && (
                    <div className={styles.grid}>
                        {packages.map(pkg => (
                            <div key={pkg.id} className={`${styles.card} ${!pkg.is_active ? styles.inactiveCard : ''}`} onClick={() => handleEdit(pkg)}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <span className={styles.cardTitle}>{pkg.name}</span>
                                        {!pkg.is_active && <span className={styles.badge}>Inativo</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={styles.cardPrice}>R$ {pkg.total_price.toFixed(2)}</span>
                                        <button className={styles.toggleBtn} onClick={(e) => { e.stopPropagation(); handleToggleStatus(pkg) }} title={pkg.is_active ? 'Desativar' : 'Ativar'}>
                                            {pkg.is_active ? '✓' : '✗'}
                                        </button>
                                    </div>
                                </div>
                                {pkg.description && <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>{pkg.description}</div>}
                                <div className={styles.cardMeta} style={{ marginBottom: '0.5rem' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: pkg.validity_type === 'monthly' ? 'rgba(59,130,246,0.15)' : pkg.validity_type === 'weekly' ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.15)', color: pkg.validity_type === 'monthly' ? '#3b82f6' : pkg.validity_type === 'weekly' ? '#8b5cf6' : '#64748b' }}>
                                        {validityLabel(pkg)}
                                    </span>
                                </div>
                                <div className={styles.servicesList}>
                                    {pkg.package_items?.map(item => (
                                        <div key={item.id} className={styles.serviceItem}>
                                            <span>{item.quantity}x {item.services.name}</span>
                                        </div>
                                    ))}
                                    {(!pkg.package_items || pkg.package_items.length === 0) && (
                                        <div style={{ fontSize: '0.8rem', color: '#999' }}>Nenhum serviço adicionado</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {packages.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#999' }}>
                                Nenhum pacote criado ainda. Clique em "Novo Pacote" para começar.
                            </div>
                        )}
                    </div>
                )}

                {/* CONTRATOS ATIVOS */}
                {tab === 'contratos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {customerPackages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Nenhum contrato ativo.</div>
                        )}
                        {customerPackages.map(cp => (
                            <div key={cp.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                            {cp.pets?.name || cp.customers?.name}
                                            {cp.pets?.name && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem' }}> • {cp.customers?.name}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            📦 {cp.service_packages?.name}
                                            <span style={{ marginLeft: '0.5rem', padding: '2px 6px', borderRadius: '8px', fontSize: '0.75rem', background: cp.service_packages?.validity_type === 'weekly' ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.15)', color: cp.service_packages?.validity_type === 'weekly' ? '#8b5cf6' : '#64748b' }}>
                                                {cp.service_packages?.validity_type === 'weekly' 
                                                    ? ((cp.service_packages as any).validity_weeks === 4 ? 'Mensal (4 sem)' : (cp.service_packages as any).validity_weeks === 1 ? 'Semanal' : `${(cp.service_packages as any).validity_weeks} semanas`)
                                                    : 'Ilimitado'}
                                            </span>
                                        </div>
                                        {cp.preferred_day_of_week !== null && (
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                                                🗓️ {DAYS_OF_WEEK[cp.preferred_day_of_week]} às {cp.preferred_time || '—'}
                                            </div>
                                        )}
                                        {cp.period_start && (
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                Período: {new Date(cp.period_start + 'T12:00:00').toLocaleDateString('pt-BR')} – {cp.period_end ? new Date(cp.period_end + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {cp.paused && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px' }}>⏸️ Pausado</span>}
                                        <button onClick={() => openSessions(cp)} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                            📋 Sessões
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const res = await pauseCustomerPackage(cp.id, !cp.paused)
                                                if (res.success) fetchData()
                                                else alert(res.message)
                                            }}
                                            style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}
                                        >
                                            {cp.paused ? '▶️ Reativar' : '⏸️ Pausar'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Cancelar este contrato de pacote?')) return
                                                const res = await cancelCustomerPackage(cp.id)
                                                if (res.success) fetchData()
                                                else alert(res.message)
                                            }}
                                            style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444' }}
                                        >
                                            ✕ Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL: Criar/Editar Template de Pacote */}
                {showModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 className={styles.title}>{isEditing ? 'Editar Pacote' : 'Novo Pacote'}</h2>

                            <form action={isEditing ? updateAction : createAction} id="packageForm">
                                {isEditing && <input type="hidden" name="id" value={selectedPackage!.id} />}
                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Nome do Pacote *</label>
                                        <input name="name" className={styles.input} defaultValue={selectedPackage?.name} placeholder="Ex: Pacote Mensal Premium" required />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Preço Total (R$) *</label>
                                        <input name="total_price" type="number" step="0.01" className={styles.input} defaultValue={selectedPackage?.total_price} required />
                                    </div>
                                    <div className={styles.inputGroup} style={{ gridColumn: '1/-1' }}>
                                        <label className={styles.label}>Descrição</label>
                                        <input name="description" className={styles.input} defaultValue={selectedPackage?.description || ''} placeholder="Descrição opcional" />
                                    </div>
                                    <div className={styles.inputGroup} style={{ gridColumn: '1/-1' }}>
                                        <label className={styles.label}>Tipo de Renovação *</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <select 
                                                name="validity_type" 
                                                className={styles.select} 
                                                defaultValue={selectedPackage?.validity_type || 'unlimited'}
                                                onChange={(e) => {
                                                    const target = e.target as HTMLSelectElement;
                                                    const weeksSelect = document.getElementById('validity_weeks_container');
                                                    if (weeksSelect) weeksSelect.style.display = target.value === 'weekly' ? 'block' : 'none';
                                                }}
                                            >
                                                <option value="unlimited">∞ Sem expiração (uso manual de créditos)</option>
                                                <option value="weekly">📆 Recorrente (por semanas)</option>
                                            </select>
                                            
                                            <div id="validity_weeks_container" style={{ display: (selectedPackage?.validity_type === 'weekly' || (!selectedPackage && false)) ? 'block' : 'none', minWidth: '150px' }}>
                                                <select name="validity_weeks" className={styles.select} defaultValue={selectedPackage?.validity_weeks || 1}>
                                                    <option value="1">1 semana (Semanal)</option>
                                                    <option value="4">4 semanas (Mensal)</option>
                                                    <option value="2">2 semanas (Quinzenal)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <small style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.3rem', display: 'block' }}>
                                            Pacotes recorrentes se renovam automaticamente ao fim do período (1, 2 ou 4 semanas).
                                        </small>
                                    </div>
                                </div>

                                <div className={styles.modalActions} style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                                    {isEditing && (
                                        <button type="button" className={styles.deleteBtn} onClick={handleDelete}>Excluir Pacote</button>
                                    )}
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" form="packageForm" className={styles.submitBtn} disabled={isCreatePending || isUpdatePending}>
                                        {isEditing ? 'Salvar Alterações' : 'Criar Pacote'}
                                    </button>
                                </div>
                            </form>

                            {/* Services in Package */}
                            {isEditing && selectedPackage && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                    <h3 className={styles.sectionTitle}>Serviços Inclusos no Pacote</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
                                        Defina quais serviços e quantidades fazem parte deste pacote.
                                    </p>
                                    <div className={styles.servicesTable}>
                                        {selectedPackage.package_items?.map(item => (
                                            <div key={item.id} className={styles.serviceRow}>
                                                <div className={styles.serviceInfo}>
                                                    <span className={styles.serviceName}>{item.services.name}</span>
                                                    <span className={styles.serviceCategory}>{formatCategory(item.services.category)}</span>
                                                </div>
                                                <div className={styles.serviceQty}>
                                                    <span className={styles.qtyBadge}>{item.quantity}x</span>
                                                </div>
                                                <button type="button" className={styles.deleteBtnSmall} onClick={() => handleRemoveService(item.id)}>🗑️</button>
                                            </div>
                                        ))}
                                        {(!selectedPackage.package_items || selectedPackage.package_items.length === 0) && (
                                            <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>Nenhum serviço adicionado ainda</div>
                                        )}
                                    </div>
                                    <div className={styles.addServiceForm}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Adicionar Serviço</h4>
                                        <div className={styles.addServiceControls}>
                                            <div className={`${styles.inputGroup} ${styles.flex2}`}>
                                                <label className={styles.label}>Serviço</label>
                                                <select className={styles.select} value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                                                    <option value="">Selecione um serviço</option>
                                                    {services.map(service => (
                                                        <option key={service.id} value={service.id}>
                                                            [{formatCategory(service.category)}] {service.name} - R$ {service.base_price.toFixed(2)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className={`${styles.inputGroup} ${styles.flex1}`}>
                                                <label className={styles.label}>Quantidade</label>
                                                <input type="number" min="1" className={styles.input} value={serviceQuantity} onChange={(e) => setServiceQuantity(parseInt(e.target.value) || 1)} />
                                            </div>
                                            <button type="button" className={styles.addBtn} onClick={handleAddService} disabled={!selectedServiceId || addingService}>
                                                + Adicionar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL: Sessões do Pacote */}
                {showSessionsModal && selectedCp && (
                    <div className={styles.modalOverlay} onClick={() => setShowSessionsModal(false)}>
                        <div className={styles.modal} style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📋 Sessões do Pacote</h2>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {selectedCp.pets?.name || selectedCp.customers?.name} • {selectedCp.service_packages?.name}
                                    </p>
                                </div>
                                <button onClick={() => setShowSessionsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                            </div>

                            {selectedCpSessions.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                    Nenhuma sessão gerada ainda para este pacote.
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto' }}>
                                {selectedCpSessions.map(session => (
                                    <div key={session.id} style={{ padding: '0.875rem', background: 'var(--bg-tertiary)', borderRadius: '10px', borderLeft: `4px solid ${STATUS_COLORS[session.status] || '#64748b'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.services?.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                                    Período: {new Date(session.period_start + 'T12:00:00').toLocaleDateString('pt-BR')} – {new Date(session.period_end + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </div>
                                                {session.scheduled_at && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        🗓️ {new Date(session.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                                <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: `${STATUS_COLORS[session.status]}22`, color: STATUS_COLORS[session.status] }}>
                                                    {STATUS_LABELS[session.status]}
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    {session.status !== 'done' && (
                                                        <button
                                                            onClick={() => setRescheduleSessionId(rescheduleSessionId === session.id ? null : session.id)}
                                                            style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}
                                                        >
                                                            📅 Reagendar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleMarkDone(session)}
                                                        style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', background: session.status === 'done' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', cursor: 'pointer', fontSize: '0.75rem', color: session.status === 'done' ? '#ef4444' : '#10b981' }}
                                                    >
                                                        {session.status === 'done' ? '↩ Reverter' : '✓ Marcar como realizado'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Formulário de reagendamento inline */}
                                        {rescheduleSessionId === session.id && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Nova Data</label>
                                                    <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className={styles.input} style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Horário</label>
                                                    <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className={styles.input} style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem' }} />
                                                </div>
                                                <button onClick={() => handleReschedule(session)} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    Confirmar
                                                </button>
                                                <button onClick={() => setRescheduleSessionId(null)} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--border)', paddingTop: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>💳 Financeiro do Contrato</h3>
                                <PaymentManager 
                                    refId={selectedCp.id}
                                    refType="package"
                                    totalDue={Number((selectedCp as any).total_price || 0)}
                                    onStatusChange={() => fetchData()}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PlanGuard>
    )
}
