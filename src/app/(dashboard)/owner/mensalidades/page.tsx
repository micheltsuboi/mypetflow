'use client'

import { useState, useEffect, useCallback, useActionState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import {
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    toggleSubscriptionPlanStatus,
    getSubscriptionPlans,
    getActiveSubscriptions,
    cancelSubscription,
    pauseSubscription,
    updateSubscriptionContract,
    subscribePetToMensalidade
} from '@/app/actions/subscription'
import PlanGuard from '@/components/modules/PlanGuard'
import PaymentManager from '@/components/finance/PaymentManager'
import PetSearchSelect from '@/components/ui/PetSearchSelect'
import { reschedulePackageSession } from '@/app/actions/package'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const initialState = { message: '', success: false }

export default function MensalidadesPage() {
    const [plans, setPlans] = useState<any[]>([])
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [tab, setTab] = useState<'planos' | 'contratos'>('planos')
    const [services, setServices] = useState<any[]>([])
    const supabase = createClient()

    // Plan modal state
    const [showPlanModal, setShowPlanModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<any>(null)
    const [selectedServices, setSelectedServices] = useState<any[]>([])
    const [showPaymentId, setShowPaymentId] = useState<string | null>(null)
    const [showSessionsId, setShowSessionsId] = useState<string | null>(null)
    const [subSessions, setSubSessions] = useState<any[]>([])
    const [editingContractId, setEditingContractId] = useState<string | null>(null)
    const [editContDays, setEditContDays] = useState<number[]>([])
    const [editContTime, setEditContTime] = useState('09:00')

    // New subscription state
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [subscribePetId, setSubscribePetId] = useState('')
    const [subSelectedPlanId, setSubSelectedPlanId] = useState('')
    const [subSelectedDays, setSubSelectedDays] = useState<number[]>([])
    const [subSelectedTime, setSubSelectedTime] = useState('09:00')
    const [subSchedules, setSubSchedules] = useState<Record<string, { days: number[], time: string }>>({})
    const [isSubscribing, setIsSubscribing] = useState(false)

    const [createState, createAction, isCreating] = useActionState(createSubscriptionPlan, initialState)
    const [updateState, updateAction, isUpdating] = useActionState(updateSubscriptionPlan, initialState)

    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [addingService, setAddingService] = useState(false)

    const fetchData = useCallback(async () => {
        const [plansData, subsData] = await Promise.all([
            getSubscriptionPlans(),
            getActiveSubscriptions()
        ])
        setPlans(plansData)
        setSubscriptions(subsData)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (profile?.org_id) {
                const { data: svc } = await supabase.from('services').select('id, name, category, base_price').eq('org_id', profile.org_id).eq('is_active', true).order('name')
                setServices(svc || [])
            }
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        if (createState.success || updateState.success) {
            setShowPlanModal(false)
            fetchData()
            alert(createState.message || updateState.message)
        } else if (createState.message || updateState.message) {
            if (!createState.success && createState.message) alert(createState.message)
            if (!updateState.success && updateState.message) alert(updateState.message)
        }
    }, [createState, updateState, fetchData])

    const openCreate = () => {
        setSelectedPlan(null)
        setIsEditing(false)
        setSelectedServices([])
        setShowPlanModal(true)
    }

    const openEdit = (plan: any) => {
        setSelectedPlan(plan)
        setIsEditing(true)
        setSelectedServices(plan.package_items?.map((i: any) => ({ service_id: i.service_id, quantity: i.quantity || 1 })) || [])
        setShowPlanModal(true)
    }

    const handleDeletePlan = async () => {
        if (!selectedPlan || !confirm(`Excluir plano "${selectedPlan.name}"?`)) return
        const res = await deleteSubscriptionPlan(selectedPlan.id)
        if (res.success) { setShowPlanModal(false); fetchData() }
        else alert(res.message)
    }

    const handleToggle = async (plan: any) => {
        await toggleSubscriptionPlanStatus(plan.id, !plan.is_active)
        fetchData()
    }

    const handleAddService = () => {
        if (!selectedServiceId) return
        if (!selectedServices.some((s: any) => s.service_id === selectedServiceId)) {
            setSelectedServices(prev => [...prev, { service_id: selectedServiceId, quantity: 1 }])
            setSelectedServiceId('')
        }
    }

    const handleRemoveService = (serviceId: string) => {
        setSelectedServices(prev => prev.filter((s: any) => s.service_id !== serviceId))
    }

    const handleUpdateServiceQuantity = (serviceId: string, quantity: number) => {
        setSelectedServices(prev => prev.map((s: any) => s.service_id === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s))
    }

    const formatCategory = (category: string) => {
        if (!category) return ''
        const mapping: Record<string, string> = {
            'creche': 'Creche', 'hotel': 'Hospedagem',
            'banho_tosa': 'Banho e Tosa', 'hospedagem': 'Hospedagem'
        }
        return mapping[category.toLowerCase()] || category
    }

    const handleCancelSubscription = async (id: string) => {
        if (!confirm('Cancelar esta mensalidade? Os agendamentos futuros serão removidos.')) return
        const res = await cancelSubscription(id)
        if (res.success) fetchData()
        else alert(res.message)
    }

    const handlePauseSubscription = async (id: string, paused: boolean) => {
        const res = await pauseSubscription(id, !paused)
        if (res.success) { alert(res.message); fetchData() }
        else alert(res.message)
    }

    const openSessions = async (subId: string) => {
        setShowSessionsId(subId)
        const { data } = await supabase
            .from('package_sessions')
            .select('*')
            .eq('customer_package_id', subId)
            .order('scheduled_at', { ascending: true })
        setSubSessions(data || [])
    }

    return (
        <PlanGuard requiredModule="mensalidades">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                        <h1 className={styles.title}>🔄 Mensalidades</h1>
                        <p className={styles.subtitle}>
                            Planos recorrentes mensais com agendamento automático. Vencimento todo dia 10.
                        </p>
                    </div>
                    {tab === 'planos' && (
                        <button className={styles.actionButton} onClick={openCreate}>+ Novo Plano</button>
                    )}
                    {tab === 'contratos' && (
                        <button className={styles.actionButton} onClick={() => {
                            setSubscribePetId('')
                            setSubSelectedPlanId('')
                            setSubSelectedDays([])
                            setSubSelectedTime('09:00')
                            setShowSubscribeModal(true)
                        }}>+ Novo Contrato</button>
                    )}
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${tab === 'planos' ? styles.active : ''}`} onClick={() => setTab('planos')}>
                        📋 Planos ({plans.length})
                    </button>
                    <button className={`${styles.tab} ${tab === 'contratos' ? styles.active : ''}`} onClick={() => setTab('contratos')}>
                        👥 Contratos Ativos ({subscriptions.length})
                    </button>
                </div>

                {/* PLANOS */}
                {tab === 'planos' && (
                    <div className={styles.grid}>
                        {plans.length === 0 && (
                            <div className={styles.emptyState}>
                                <span>🔄</span>
                                Nenhum plano de mensalidade criado ainda.<br />
                                Clique em "Novo Plano" para começar.
                            </div>
                        )}
                        {plans.map(plan => (
                            <div
                                key={plan.id}
                                className={`${styles.planCard} ${!plan.is_active ? styles.inactive : ''}`}
                                onClick={() => openEdit(plan)}
                            >
                                <div className={styles.planCardHeader}>
                                    <div>
                                        <div className={styles.planName}>{plan.name}</div>
                                        <span className={`${styles.badge} ${styles.subscription}`}>Mensalidade</span>
                                        {!plan.is_active && <span className={`${styles.badge} ${styles.inactive}`} style={{ marginLeft: '0.4rem' }}>Inativo</span>}
                                    </div>
                                    <div>
                                        <div className={styles.planPrice}>R$ {Number(plan.total_price).toFixed(2).replace('.', ',')}</div>
                                        <button
                                            className={styles.toggleBtn}
                                            onClick={e => { e.stopPropagation(); handleToggle(plan) }}
                                            title={plan.is_active ? 'Desativar' : 'Ativar'}
                                        >
                                            {plan.is_active ? '✓' : '✗'}
                                        </button>
                                    </div>
                                </div>
                                {plan.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{plan.description}</p>}
                                <div className={styles.planMeta}>
                                    <div className={styles.planMetaItem}>
                                        📅 Vencimento: Dia {plan.billing_day || 10} de cada mês
                                    </div>
                                    {plan.package_items && plan.package_items.length > 0 && (
                                        <div className={styles.planMetaItem}>
                                            ✂️ {plan.package_items.map((i: any) => `${i.services?.name || 'Serviço'} (${i.quantity || 1}x)`).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CONTRATOS */}
                {tab === 'contratos' && (
                    <div className={styles.subscriptionList}>
                        {subscriptions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                Nenhuma mensalidade ativa no momento.
                            </div>
                        )}
                        {subscriptions.map(sub => {
                            const plan = sub.service_packages as any
                            const pet = sub.pets as any
                            const customer = sub.customers as any
                            const days = (sub.preferred_days_of_week || []).map((d: number) => DAYS_FULL[d]).join(' e ')

                            return (
                                <div key={sub.id} className={styles.subscriptionCard}>
                                    <div className={styles.subscriptionInfo}>
                                        <div className={styles.subscriptionPrimary}>
                                            {pet?.name || 'Pet'}
                                            <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                                • {customer?.name}
                                            </span>
                                        </div>
                                        <div className={styles.subscriptionSecondary}>
                                            🔄 {plan?.name} — R$ {Number(plan?.total_price || sub.total_price || 0).toFixed(2).replace('.', ',')}
                                        </div>
                                        {days && <div className={styles.subscriptionSecondary}>🗓️ {days} às {sub.preferred_time || '—'}</div>}
                                        <div className={styles.subscriptionDue}>
                                            💳 Vence dia {plan?.billing_day || 10}
                                            {sub.paused && <span style={{ marginLeft: '0.75rem', color: '#f59e0b' }}>⏸️ Pausada</span>}
                                        </div>
                                    </div>
                                    <div className={styles.subscriptionActions}>
                                        <button className={styles.btnAction} onClick={() => openSessions(sub.id)}>📋 Sessões</button>
                                        <button
                                            className={styles.btnAction}
                                            onClick={async () => {
                                                setEditingContractId(sub.id)
                                                const { data: creditsData } = await supabase
                                                    .from('package_credits')
                                                    .select('service_id, preferred_days_of_week, preferred_time')
                                                    .eq('customer_package_id', sub.id)
                                                
                                                const initialSchedules: Record<string, { days: number[], time: string }> = {}
                                                if (creditsData && creditsData.length > 0) {
                                                    creditsData.forEach((item: any) => {
                                                        initialSchedules[item.service_id] = {
                                                            days: item.preferred_days_of_week || [],
                                                            time: item.preferred_time?.substring(0,5) || '09:00'
                                                        }
                                                    })
                                                } else {
                                                    const plan = sub.service_packages as any
                                                    if (plan?.package_items) {
                                                        plan.package_items.forEach((item: any) => {
                                                            initialSchedules[item.service_id] = {
                                                                days: sub.preferred_days_of_week || [],
                                                                time: sub.preferred_time?.substring(0,5) || '09:00'
                                                            }
                                                        })
                                                    }
                                                }
                                                setSubSchedules(initialSchedules)
                                            }}
                                        >✏️ Ajustar</button>
                                        <button
                                            className={styles.btnAction}
                                            onClick={() => setShowPaymentId(showPaymentId === sub.id ? null : sub.id)}
                                        >💳 Pagamento</button>
                                        <button
                                            className={styles.btnAction}
                                            onClick={() => handlePauseSubscription(sub.id, sub.paused)}
                                        >
                                            {sub.paused ? '▶️ Reativar' : '⏸️ Pausar'}
                                        </button>
                                        <button
                                            className={styles.btnDanger}
                                            onClick={() => handleCancelSubscription(sub.id)}
                                        >✕ Cancelar</button>
                                    </div>

                                    {showPaymentId === sub.id && (
                                        <div style={{ width: '100%', paddingTop: '1rem', borderTop: '1px dashed var(--card-border)', marginTop: '0.5rem' }}>
                                            <PaymentManager
                                                refId={sub.id}
                                                refType="package"
                                                totalDue={Number(plan?.total_price || sub.total_price || 0)}
                                                onStatusChange={() => fetchData()}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* MODAL: Criar/Editar Plano */}
                {showPlanModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowPlanModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>{isEditing ? '✏️ Editar Plano' : '🔄 Novo Plano de Mensalidade'}</h2>

                            <form action={isEditing ? updateAction : createAction} id="planForm">
                                {isEditing && <input type="hidden" name="id" value={selectedPlan?.id} />}
                                <input type="hidden" name="services_json" value={JSON.stringify(selectedServices)} />

                                <div className={styles.formGrid}>
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Nome do Plano *</label>
                                        <input
                                            name="name"
                                            className={styles.input}
                                            defaultValue={selectedPlan?.name}
                                            placeholder="Ex: Creche Semanal, Banho Quinzenal..."
                                            required
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Valor Mensal (R$) *</label>
                                        <input
                                            name="total_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className={styles.input}
                                            defaultValue={selectedPlan?.total_price}
                                            required
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Dia de Vencimento</label>
                                        <input
                                            name="billing_day"
                                            type="number"
                                            min="1"
                                            max="28"
                                            className={styles.input}
                                            defaultValue={selectedPlan?.billing_day || 10}
                                        />
                                    </div>
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Descrição</label>
                                        <input
                                            name="description"
                                            className={styles.input}
                                            defaultValue={selectedPlan?.description || ''}
                                            placeholder="Descrição opcional"
                                        />
                                    </div>
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                        <label className={styles.label} style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>
                                            🛠️ Serviços Inclusos no Plano
                                        </label>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            Selecione quais serviços cadastrados fazem parte desta mensalidade.
                                        </p>

                                        {/* Lista de selecionados */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                            {selectedServices.map(item => {
                                                const s = services.find(srv => srv.id === item.service_id)
                                                if (!s) return null
                                                return (
                                                    <div key={item.service_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatCategory(s.category)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qtd:</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={e => handleUpdateServiceQuantity(item.service_id, parseInt(e.target.value) || 1)}
                                                                style={{
                                                                    width: '60px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--border)',
                                                                    background: 'var(--bg-primary)',
                                                                    color: 'var(--text-primary)',
                                                                    textAlign: 'center'
                                                                }}
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveService(item.service_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }} title="Remover">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            {selectedServices.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    Nenhum serviço adicionado. Selecione abaixo:
                                                </div>
                                            )}
                                        </div>

                                        {/* Dropdown de adição */}
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className={styles.label}>Adicionar Serviço</label>
                                                <select
                                                    className={styles.input}
                                                    value={selectedServiceId}
                                                    onChange={e => setSelectedServiceId(e.target.value)}
                                                    style={{ height: '42px' }}
                                                >
                                                    <option value="">Escolha um serviço...</option>
                                                    {services.map(s => (
                                                        <option key={s.id} value={s.id} disabled={selectedServices.some((x: any) => x.service_id === s.id)}>
                                                            [{formatCategory(s.category)}] {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddService}
                                                disabled={!selectedServiceId}
                                                style={{ height: '42px', padding: '0 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: !selectedServiceId ? 0.5 : 1 }}
                                            >
                                                + Adicionar
                                            </button>
                                        </div>
                                        {selectedServices.length === 0 && <small style={{ color: '#ef4444', marginTop: '0.5rem', display: 'block' }}>⚠️ Adicione pelo menos um serviço para continuar.</small>}
                                    </div>
                                </div>

                                <div className={styles.modalActions}>
                                    {isEditing && (
                                        <button type="button" className={styles.deleteBtn} onClick={handleDeletePlan}>
                                            🗑️ Excluir
                                        </button>
                                    )}
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowPlanModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={styles.submitBtn} disabled={isCreating || isUpdating}>
                                        {isEditing ? 'Salvar' : 'Criar Plano'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Contratar Mensalidade */}
                {showSubscribeModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }} onClick={() => setShowSubscribeModal(false)}>
                        <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>🔄 Contratar Mensalidade</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Selecionar Pet *</label>
                                    <PetSearchSelect 
                                        name="pet_id"
                                        onSelect={setSubscribePetId}
                                        placeholder="Buscar pet..."
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Plano de Mensalidade *</label>
                                    <select className={styles.input} value={subSelectedPlanId} onChange={e => {
                                        const planId = e.target.value
                                        setSubSelectedPlanId(planId)
                                        const plan = plans.find((p: any) => p.id === planId)
                                        
                                        // Inicializa os agendamentos individuais para cada serviço do plano
                                        const initialSchedules: Record<string, { days: number[], time: string }> = {}
                                        if (plan?.package_items) {
                                            plan.package_items.forEach((item: any) => {
                                                initialSchedules[item.service_id] = { days: [], time: '09:00' }
                                            })
                                        }
                                        setSubSchedules(initialSchedules)
                                    }}>
                                        <option value="">Selecione um plano</option>
                                        {plans.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.total_price).toFixed(2).replace('.', ',')}/mês</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Agendamento Individual por Serviço na Mensalidade */}
                                {(() => {
                                    const plan = plans.find((p: any) => p.id === subSelectedPlanId)
                                    if (plan && plan.package_items && plan.package_items.length > 0) {
                                        return (
                                            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>🗓️ Agendamento Individual por Serviço</div>
                                                {plan.package_items.map((item: any) => {
                                                    const svcSchedule = subSchedules[item.service_id] || { days: [], time: '09:00' }
                                                    const svcName = item.services?.name || 'Serviço'
                                                    
                                                    return (
                                                        <div key={item.service_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px', borderBottom: '1px dashed var(--border)' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                                {svcName} ({item.quantity || 1}x no mês)
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                 {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day, idx) => {
                                                                     const isChecked = svcSchedule.days.includes(idx)
                                                                     return (
                                                                         <button
                                                                             key={idx}
                                                                             type="button"
                                                                             onClick={() => {
                                                                                 const updatedDays = isChecked 
                                                                                     ? svcSchedule.days.filter(d => d !== idx)
                                                                                     : [...svcSchedule.days, idx].sort()
                                                                                 setSubSchedules(prev => ({
                                                                                     ...prev,
                                                                                     [item.service_id]: { ...svcSchedule, days: updatedDays }
                                                                                 }))
                                                                             }}
                                                                             style={{
                                                                                 padding: '4px 8px',
                                                                                 borderRadius: '20px',
                                                                                 border: '1.5px solid',
                                                                                 borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                                                                                 background: isChecked ? 'var(--primary)' : 'transparent',
                                                                                 color: isChecked ? '#fff' : 'var(--text-secondary)',
                                                                                 fontWeight: isChecked ? 700 : 400,
                                                                                 fontSize: '0.7rem',
                                                                                 cursor: 'pointer',
                                                                                 transition: 'all 0.15s'
                                                                             }}
                                                                         >
                                                                             {day}
                                                                         </button>
                                                                     )
                                                                 })}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                                 <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Horário Fixo:</label>
                                                                 <input
                                                                     type="time"
                                                                     className={styles.input}
                                                                     value={svcSchedule.time}
                                                                     onChange={e => {
                                                                         const val = e.target.value
                                                                         setSubSchedules(prev => ({
                                                                             ...prev,
                                                                             [item.service_id]: { ...svcSchedule, time: val }
                                                                         }))
                                                                     }}
                                                                     style={{ fontSize: '0.75rem', width: '100px', padding: '2px 4px', height: '28px' }}
                                                                 />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    }
                                    return null
                                })()}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                <button type="button" onClick={() => setShowSubscribeModal(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button type="button"
                                    disabled={!subscribePetId || !subSelectedPlanId || isSubscribing}
                                    onClick={async () => {
                                        if (!subscribePetId || !subSelectedPlanId) return alert('Selecione um pet e um plano.')
                                        
                                        // Constrói creditSchedules para enviar
                                        const creditSchedules = Object.keys(subSchedules).map(serviceId => ({
                                            service_id: serviceId,
                                            preferred_days_of_week: subSchedules[serviceId].days.length > 0 ? subSchedules[serviceId].days : null,
                                            preferred_time: subSchedules[serviceId].time || null
                                        }))

                                        setIsSubscribing(true)
                                        const res = await subscribePetToMensalidade(
                                            subscribePetId,
                                            subSelectedPlanId,
                                            null,
                                            null,
                                            creditSchedules.length > 0 ? creditSchedules : null
                                        )
                                        setIsSubscribing(false)
                                        if (res.success) { 
                                            setShowSubscribeModal(false)
                                            fetchData()
                                            alert(res.message) 
                                        }
                                        else alert(res.message)
                                    }}
                                    className={styles.submitBtn}
                                    style={{ opacity: (!subscribePetId || !subSelectedPlanId || isSubscribing) ? 0.5 : 1 }}
                                >{isSubscribing ? '⏳ Agendando...' : '✅ Confirmar Mensalidade'}</button>
                            </div>
                        </div>
                    </div>
                )}

            {/* MODAL DE SESSÕES */}
            {showSessionsId && (() => {
                const sub = subscriptions.find((s: any) => s.id === showSessionsId)
                if (!sub) return null
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSessionsId(null)}>
                        <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className={styles.modalTitle} style={{ margin: 0 }}>📋 Sessões do Mês</h2>
                                <button onClick={() => setShowSessionsId(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {subSessions.length === 0 && (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Nenhuma sessão gerada ainda.</p>
                                )}
                                {subSessions.map(s => {
                                    const d = new Date(s.scheduled_at)
                                    const statusClass = s.status === 'done' ? styles.statusDone : s.status === 'missed' ? styles.statusMissed : styles.statusPending
                                    return (
                                        <div key={s.id} className={`${styles.sessionItem} ${statusClass}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {DAYS_FULL[d.getDay()]}, {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Sessão #{s.session_number}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
                                                    background: s.status === 'done' ? 'rgba(16,185,129,0.15)' : s.status === 'missed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: s.status === 'done' ? '#10b981' : s.status === 'missed' ? '#ef4444' : '#f59e0b'
                                                }}>
                                                    {s.status === 'done' ? 'Realizado' : s.status === 'missed' ? 'Não realizado' : 'Agendado'}
                                                </span>
                                                {s.status !== 'done' && s.status !== 'missed' && (
                                                    <button 
                                                        className={styles.btnAction}
                                                        style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                                                        onClick={async () => {
                                                            const dateStr = prompt('Digite a nova data e hora (Ex: 25/03/2026 14:00)', s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('pt-BR').slice(0, 16) : '')
                                                            if (!dateStr) return
                                                            
                                                            const [dVal, mVal, yVal, hVal, minVal] = dateStr.match(/\d+/g) || []
                                                            if (!dVal || !mVal || !yVal || !hVal || !minVal) return alert('Formato inválido. Use DD/MM/AAAA HH:MM')
                                                            
                                                            const isoDate = `${yVal}-${mVal}-${dVal}T${hVal}:${minVal}:00`
                                                            const res = await reschedulePackageSession(s.id, isoDate, true, sub.pet_id, sub.org_id, s.service_id)
                                                            if (res.success) {
                                                                alert(res.message)
                                                                openSessions(showSessionsId)
                                                            } else alert(res.message)
                                                        }}
                                                    >
                                                        Reagendar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* MODAL DE AJUSTE (EDIT) DE MENSALIDADE */}
            {editingContractId && (() => {
                const sub = subscriptions.find((s: any) => s.id === editingContractId)
                if (!sub) return null
                const plan = sub.service_packages as any
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.5)' }} onClick={() => setEditingContractId(null)}>
                        <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>⚙️ Ajustar Mensalidade — {plan?.name}</h3>
                                <button onClick={() => setEditingContractId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>🗓️ Agendamento Individual por Serviço</div>
                                    {plan?.package_items?.map((item: any) => {
                                        const svcSchedule = subSchedules[item.service_id] || { days: [], time: '09:00' }
                                        const svcName = item.services?.name || 'Serviço'
                                        
                                        return (
                                            <div key={item.service_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px', borderBottom: '1px dashed var(--border)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                    {svcName} ({item.quantity || 1}x no mês)
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                     {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day, idx) => {
                                                         const isChecked = svcSchedule.days.includes(idx)
                                                         return (
                                                             <button
                                                                 key={idx}
                                                                 type="button"
                                                                 onClick={() => {
                                                                     const updatedDays = isChecked 
                                                                         ? svcSchedule.days.filter(d => d !== idx)
                                                                         : [...svcSchedule.days, idx].sort()
                                                                     setSubSchedules(prev => ({
                                                                         ...prev,
                                                                         [item.service_id]: { ...svcSchedule, days: updatedDays }
                                                                     }))
                                                                 }}
                                                                 style={{
                                                                     padding: '4px 8px',
                                                                     borderRadius: '20px',
                                                                     border: '1.5px solid',
                                                                     borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                                                                     background: isChecked ? 'var(--primary)' : 'transparent',
                                                                     color: isChecked ? '#fff' : 'var(--text-secondary)',
                                                                     fontWeight: isChecked ? 700 : 400,
                                                                     fontSize: '0.7rem',
                                                                     cursor: 'pointer',
                                                                     transition: 'all 0.15s'
                                                                 }}
                                                             >
                                                                 {day}
                                                             </button>
                                                         )
                                                     })}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                     <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Horário Fixo:</label>
                                                     <input
                                                         type="time"
                                                         className={styles.input}
                                                         value={svcSchedule.time}
                                                         onChange={e => {
                                                             const val = e.target.value
                                                             setSubSchedules(prev => ({
                                                                 ...prev,
                                                                 [item.service_id]: { ...svcSchedule, time: val }
                                                             }))
                                                         }}
                                                         style={{ fontSize: '0.75rem', width: '100px', padding: '2px 4px', height: '28px' }}
                                                     />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                <button type="button" onClick={() => setEditingContractId(null)} className={styles.cancelBtn}>Cancelar</button>
                                <button
                                    onClick={async () => {
                                        // Constrói creditSchedules para enviar
                                        const creditSchedules = Object.keys(subSchedules).map(serviceId => ({
                                            service_id: serviceId,
                                            preferred_days_of_week: subSchedules[serviceId].days.length > 0 ? subSchedules[serviceId].days : null,
                                            preferred_time: subSchedules[serviceId].time || null
                                        }))

                                        const res = await updateSubscriptionContract(sub.id, null, null, creditSchedules)
                                        if (res.success) {
                                            alert(res.message)
                                            setEditingContractId(null)
                                            fetchData()
                                        } else alert(res.message)
                                    }}
                                    className={styles.submitBtn}
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
            </div>
        </PlanGuard>
    )
}
