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
    pauseSubscription
} from '@/app/actions/subscription'
import PlanGuard from '@/components/modules/PlanGuard'
import PaymentManager from '@/components/finance/PaymentManager'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const initialState = { message: '', success: false }

function computePreviewSessions(daysOfWeek: number[], time: string): string[] {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const sessions: string[] = []

    for (const dow of daysOfWeek) {
        let d = new Date(monthStart)
        while (d.getDay() !== dow) d.setDate(d.getDate() + 1)
        while (d <= monthEnd) {
            sessions.push(`${DAYS_FULL[dow]}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time || '09:00'}`)
            d.setDate(d.getDate() + 7)
        }
    }

    return sessions.sort((a, b) => a.localeCompare(b))
}

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
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [previewTime, setPreviewTime] = useState('09:00')
    const [showPaymentId, setShowPaymentId] = useState<string | null>(null)
    const [showSessionsId, setShowSessionsId] = useState<string | null>(null)
    const [subSessions, setSubSessions] = useState<any[]>([])

    const [createState, createAction, isCreating] = useActionState(createSubscriptionPlan, initialState)
    const [updateState, updateAction, isUpdating] = useActionState(updateSubscriptionPlan, initialState)

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
                const { data: svc } = await supabase.from('services').select('id, name, category').eq('org_id', profile.org_id).eq('is_active', true).order('name')
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
        setSelectedDays([])
        setPreviewTime('09:00')
        setShowPlanModal(true)
    }

    const openEdit = (plan: any) => {
        setSelectedPlan(plan)
        setIsEditing(true)
        setSelectedDays(plan.subscription_days_of_week || [])
        setPreviewTime(plan.subscription_time || '09:00')
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

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        )
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

    const previewSessions = computePreviewSessions(selectedDays, previewTime)

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
                                    {plan.subscription_days_of_week && plan.subscription_days_of_week.length > 0 && (
                                        <div className={styles.planMetaItem}>
                                            🗓️ Dias padrão: {plan.subscription_days_of_week.map((d: number) => DAYS[d]).join(', ')}
                                        </div>
                                    )}
                                    {plan.subscription_time && (
                                        <div className={styles.planMetaItem}>
                                            ⏰ Horário padrão: {plan.subscription_time}
                                        </div>
                                    )}
                                    {plan.package_items && plan.package_items.length > 0 && (
                                        <div className={styles.planMetaItem}>
                                            ✂️ {plan.package_items.map((i: any) => i.services?.name).filter(Boolean).join(', ')}
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
                                {selectedDays.map(d => (
                                    <input key={d} type="hidden" name="default_days_of_week" value={d} />
                                ))}

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
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Dias da Semana Padrão</label>
                                        <div className={styles.daysGrid}>
                                            {DAYS.map((d, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`${styles.dayChip} ${selectedDays.includes(i) ? styles.selected : ''}`}
                                                    onClick={() => toggleDay(i)}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                            Dias padrão sugeridos ao contratar. O tutor pode escolher outros dias.
                                        </small>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Horário Padrão</label>
                                        <input
                                            name="subscription_time"
                                            type="time"
                                            className={styles.input}
                                            defaultValue={selectedPlan?.subscription_time || '09:00'}
                                            onChange={e => setPreviewTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Session Preview */}
                                {selectedDays.length > 0 && (
                                    <div className={styles.sessionPreview}>
                                        <div className={styles.sessionPreviewTitle}>
                                            📅 Preview de sessões do mês atual ({previewSessions.length} sessões)
                                        </div>
                                        {previewSessions.map((s, i) => (
                                            <div key={i} className={styles.sessionPreviewItem}>• {s}</div>
                                        ))}
                                    </div>
                                )}

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

                {/* MODAL: Sessions */}
                {showSessionsId && (
                    <div className={styles.modalOverlay} onClick={() => setShowSessionsId(null)}>
                        <div className={`${styles.modal} ${styles.sessionModal}`} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className={styles.modalTitle} style={{ margin: 0 }}>📋 Sessões do Mês</h2>
                                <button onClick={() => setShowSessionsId(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                            </div>
                            <div className={styles.sessions}>
                                {subSessions.length === 0 && (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Nenhuma sessão gerada ainda.</p>
                                )}
                                {subSessions.map(s => {
                                    const d = new Date(s.scheduled_at)
                                    const statusClass = s.status === 'done' ? styles.statusDone : s.status === 'missed' ? styles.statusMissed : styles.statusPending
                                    return (
                                        <div key={s.id} className={`${styles.sessionItem} ${statusClass}`}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {DAYS_FULL[d.getDay()]}, {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sessão #{s.session_number}</div>
                                            </div>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
                                                background: s.status === 'done' ? 'rgba(16,185,129,0.15)' : s.status === 'missed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                color: s.status === 'done' ? '#10b981' : s.status === 'missed' ? '#ef4444' : '#f59e0b'
                                            }}>
                                                {s.status === 'done' ? 'Realizado' : s.status === 'missed' ? 'Não realizado' : 'Agendado'}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PlanGuard>
    )
}
