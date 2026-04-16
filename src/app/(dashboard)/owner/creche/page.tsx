'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import Link from 'next/link'
import DateRangeFilter, { DateRange, getDateRange } from '@/components/DateRangeFilter'
import { checkInAppointment, checkOutAppointment } from '@/app/actions/checkInOut'
import { deleteAppointment, createAppointment } from '@/app/actions/appointment'
import DailyReportModal from '@/components/DailyReportModal'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import PaymentControls from '@/components/PaymentControls'
import PlanGuard from '@/components/modules/PlanGuard'
import PetSearchSelect from '@/components/ui/PetSearchSelect'
import EmitirNFModal from '@/components/EmitirNFModal'

interface Appointment {
    id: string
    pet_id: string
    service_id: string
    scheduled_at: string
    status: 'pending' | 'confirmed' | 'in_progress' | 'done' | 'completed' | 'canceled' | 'no_show'
    notes: string | null
    actual_check_in: string | null
    actual_check_out: string | null
    is_package?: boolean
    package_credit_id?: string
    is_subscription?: boolean // Novo campo detectado via join
    session_number?: number
    total_sessions?: number
    pets: {
        id?: string
        name: string
        species: string
        breed: string | null
        customers: { id: string, name: string, cpf_cnpj?: string, address?: string, neighborhood?: string, city?: string, email?: string, phone_1?: string }
    }
    services: {
        name: string
        base_price: number
        service_categories: { name: string, color: string, icon: string }
    }
    calculated_price: number | null
    final_price: number | null
    discount_percent: number | null
    discount_type: string | null
    discount: number | null
    payment_status: string | null
    payment_method: string | null
}

export default function CrechePage() {
    const supabase = createClient()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange>('today')
    const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active')
    const [searchTerm, setSearchTerm] = useState('')
    const [showNewModal, setShowNewModal] = useState(false)
    const [showNFModal, setShowNFModal] = useState(false)
    const [nfAppointment, setNfAppointment] = useState<Appointment | null>(null)
    const [nfMap, setNfMap] = useState<Record<string, { id: string, status: string, pdf_url?: string, ref?: string }>>({})
    const [paidMap, setPaidMap] = useState<Record<string, number>>({})
    const [planFeatures, setPlanFeatures] = useState<string[]>([])

    const handleSendWhatsApp = async (referencia: string) => {
        if (!referencia) {
            alert('Referência da NF não encontrada.')
            return
        }
        try {
            const response = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referencia })
            })

            if (response.ok) {
                alert('✅ NF enviada com sucesso para o WhatsApp do tutor!')
            } else {
                const err = await response.json()
                alert('❌ Erro ao enviar: ' + (err.error || 'Erro desconhecido'))
            }
        } catch (error) {
            console.error('Erro ao chamar send-whatsapp:', error)
            alert('❌ Erro de conexão ao tentar enviar WhatsApp.')
        }
    }

    const fetchCrecheData = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            // Buscar features do plano
            const { data: orgData } = await supabase
                .from('organizations')
                .select('saas_plans(features)')
                .eq('id', profile.org_id)
                .single()
            if (orgData) {
                setPlanFeatures((orgData.saas_plans as any)?.features || [])
            }

            // Get Date Range based on filter
            const { start, end } = getDateRange(dateRange, customStartDate, customEndDate)
            const startISO = start.toISOString()
            const endISO = end.toISOString()

            // Status Filter based on viewMode
            const statusFilter = viewMode === 'active'
                ? ['pending', 'confirmed', 'in_progress']
                : ['done', 'completed']

            // Fetch Appointments
            const { data: appts, error } = await supabase
                .from('appointments')
                .select(`
                    id, pet_id, service_id, scheduled_at, status, notes,
                    calculated_price, final_price, discount_percent, discount_type, discount, payment_status, payment_method,
                    actual_check_in, actual_check_out,
                    is_package, package_credit_id,
                    package_sessions (
                        id,
                        session_number,
                        customer_packages (
                            id,
                            is_subscription
                        )
                    ),
                    pets ( name, species, breed, customers ( id, name, cpf_cnpj, address, neighborhood, city, email, phone_1 ) ),
                    services!inner ( 
                        name, 
                        base_price,
                        service_categories!inner ( name, color, icon )
                    )
                `)
                .eq('org_id', profile.org_id)
                .eq('services.service_categories.name', 'Creche') // Filter by joined category name
                .gte('scheduled_at', startISO)
                .lte('scheduled_at', endISO)
                .in('status', statusFilter)
                .order('scheduled_at', { ascending: viewMode === 'active' })

            // Fetch income transactions to calculate balances
            const { data: txs } = await supabase
                .from('financial_transactions')
                .select('reference_id, amount')
                .eq('org_id', profile.org_id)
                .eq('type', 'income')
                .not('reference_id', 'is', null)

            if (txs) {
                const newPaidMap: Record<string, number> = {}
                txs.forEach((t: any) => {
                    newPaidMap[t.reference_id] = (newPaidMap[t.reference_id] || 0) + Number(t.amount)
                })
                setPaidMap(newPaidMap)
            }

            if (error) {
                console.error('Error fetching creche:', error)
            } else if (appts) {
                const apptsTyped = appts as unknown as Appointment[]

                // Extrair info de sessão e assinatura de forma mais eficiente
                const apptsWithSession = await Promise.all(apptsTyped.map(async (a: any) => {
                    const sessionInfo = a.package_sessions?.[0]
                    const isSubscription = sessionInfo?.customer_packages?.is_subscription || false
                    let sessionNumber = sessionInfo?.session_number || null
                    let totalSessions = null

                    if (isSubscription && sessionInfo?.customer_packages?.id) {
                        // Para mensalidades, o total é o número de sessões no mês
                        const date = new Date(a.scheduled_at)
                        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
                        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

                        const { count } = await supabase
                            .from('package_sessions')
                            .select('*', { count: 'exact', head: true })
                            .eq('customer_package_id', sessionInfo.customer_packages.id)
                            .gte('scheduled_at', monthStart)
                            .lte('scheduled_at', monthEnd)
                        
                        totalSessions = count || 0

                        // Recalcular o session_number dentro do mês
                        const { count: currentCount } = await supabase
                            .from('package_sessions')
                            .select('*', { count: 'exact', head: true })
                            .eq('customer_package_id', sessionInfo.customer_packages.id)
                            .gte('scheduled_at', monthStart)
                            .lte('scheduled_at', a.scheduled_at)
                        
                        sessionNumber = currentCount || 1
                    } else if (a.is_package && sessionInfo?.customer_packages?.id) {
                        // Para pacotes normais, busca o total de créditos
                        const { data: creditData } = await supabase
                            .from('package_credits')
                            .select('total_quantity')
                            .eq('customer_package_id', sessionInfo.customer_packages.id)
                            .order('total_quantity', { ascending: false })
                            .limit(1)
                            .single()
                        
                        totalSessions = creditData?.total_quantity || 0
                    }

                    return {
                        ...a,
                        is_subscription: isSubscription,
                        session_number: sessionNumber,
                        total_sessions: totalSessions
                    }
                }))

                setAppointments(apptsWithSession)

                // Buscar Notas Fiscais vinculadas
                const apptIds = apptsTyped.map(a => a.id)
                if (apptIds.length > 0) {
                    const { data: nfs } = await supabase
                        .from('notas_fiscais')
                        .select('id, origem_id, status, caminho_pdf, referencia')
                        .eq('origem_tipo', 'atendimento')
                        .in('origem_id', apptIds)

                    if (nfs) {
                        const map: any = {}
                        nfs.forEach(nf => {
                            map[nf.origem_id] = {
                                id: nf.id,
                                status: nf.status,
                                pdf_url: nf.caminho_pdf,
                                ref: nf.referencia
                            }
                        })
                        setNfMap(map)
                    }
                }
            }

        } catch (error) {
            console.error(error)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }, [supabase, dateRange, customStartDate, customEndDate, viewMode])

    const handleUpdateAppointment = (apptId: string) => {
        setNfAppointment(appointments.find(a => a.id === apptId) || null)
        setShowNFModal(true)
        fetchCrecheData(true)
    }

    useEffect(() => {
        fetchCrecheData()
    }, [fetchCrecheData])

    // Realtime: atualizar status da NF automaticamente
    useEffect(() => {
        const channel = supabase
            .channel('nf-updates-creche')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notas_fiscais' },
                (payload) => {
                    const nf = payload.new as any
                    if (nf && nf.origem_id) {
                        setNfMap(prev => ({
                            ...prev,
                            [nf.origem_id]: {
                                id: nf.id,
                                status: nf.status,
                                pdf_url: nf.caminho_pdf,
                                ref: nf.referencia
                            }
                        }))
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const handleCheckIn = async (appointmentId: string) => {
        const result = await checkInAppointment(appointmentId)
        if (result.success) {
            // Refetch in background
            fetchCrecheData(true)

            // Optimistic update to open modal immediately
            const currentObj = appointments.find(a => a.id === appointmentId)
            if (currentObj) {
                const updated = { 
                    ...currentObj, 
                    actual_check_in: new Date().toISOString(),
                    status: 'in_progress' as const
                }
                setSelectedAppointment(updated)
            }
        } else {
            alert(result.message)
        }
    }

    const handleCheckOut = async (appointmentId: string) => {
        const result = await checkOutAppointment(appointmentId)
        if (result.success) {
            alert(result.message)
            fetchCrecheData()
        } else {
            alert(result.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return
        const result = await deleteAppointment(id)
        if (result.success) {
            alert(result.message)
            fetchCrecheData()
        } else {
            alert(result.message)
        }
    }

    const filteredAppointments = appointments.filter(appt => {
        if (!searchTerm) return true
        const lowerSearch = searchTerm.toLowerCase()
        const petName = appt.pets?.name?.toLowerCase() || ''
        const tutorName = appt.pets?.customers?.name?.toLowerCase() || ''
        return petName.includes(lowerSearch) || tutorName.includes(lowerSearch)
    })

    return (
        <PlanGuard requiredModule="creche">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🎾 Creche - {viewMode === 'active' ? 'Pets do Dia' : 'Histórico'}</h1>
                    <div className={styles.actionGroup}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar pet ou tutor..."
                            value={searchTerm}
                            className={styles.searchInput}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className={styles.buttonGroup}>
                            <button
                                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                                onClick={() => setShowNewModal(true)}
                                style={{ flex: 1 }}
                            >
                                + Novo Agendamento
                            </button>
                            <button
                                className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                                onClick={() => fetchCrecheData()}
                            >
                                ↻
                            </button>
                        </div>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className={styles.tabs}>
                    <button
                        onClick={() => setViewMode('active')}
                        className={`${styles.tab} ${viewMode === 'active' ? styles.activeTab : ''}`}
                    >
                        Em Aberto / Na Creche
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`${styles.tab} ${viewMode === 'history' ? styles.activeTab : ''}`}
                    >
                        📜 Histórico
                    </button>
                </div>

                {/* Date Range Filter */}
                <DateRangeFilter 
                    value={dateRange} 
                    onChange={setDateRange} 
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onCustomDatesChange={(start, end) => {
                        setCustomStartDate(start)
                        setCustomEndDate(end)
                    }}
                />

                {loading ? (
                    <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Carregando...</div>
                ) : filteredAppointments.length === 0 ? (
                    <div style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        {searchTerm ? 'Nenhum resultado encontrado para a busca.' : (viewMode === 'active' ? 'Nenhum pet agendado para a creche no período selecionado.' : 'Nenhum histórico encontrado para o período.')}
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filteredAppointments.map(appt => (
                            <div
                                key={appt.id}
                                className={styles.appointmentCard}
                                style={{
                                    borderLeft: `4px solid ${appt.services?.service_categories?.color || '#10B981'}`,
                                    background: 'var(--bg-secondary)',
                                    opacity: 1,
                                    cursor: 'default',
                                    position: 'relative' // Ensure relative positioning for absolute badge
                                }}>
                                {/* Date Badge - Enhanced for visibility */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    right: '16px',
                                    background: appt.services?.service_categories?.color || '#10B981', // Fallback to Green
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    lineHeight: 1,
                                    border: '3px solid var(--bg-primary)', // Thicker border to detach from card
                                    minWidth: '54px'
                                }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>
                                        {new Date(appt.scheduled_at).getDate()}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px', opacity: 0.95 }}>
                                        {new Date(appt.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                    </span>
                                </div>

                                {/* Main Content with Padding to avoid badge overlap */}
                                <div className={styles.cardTop} style={{ marginTop: '1rem', paddingTop: '0.5rem' }}>
                                    <div className={styles.petInfoMain} style={{ flex: 1, minWidth: 0 }}>
                                        <div className={styles.petAvatar}>{appt.pets?.species === 'cat' ? '🐱' : '🐶'}</div>
                                        <div className={styles.petDetails} style={{ minWidth: 0, paddingRight: '1rem' }}>
                                            <div className={styles.petName} style={{ flexWrap: 'wrap', gap: '0.5rem' }} onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedAppointment(appt)
                                            }}>
                                                {appt.pets?.name || 'Pet'}
                                                <span className={styles.statusBadge} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                                    {appt.actual_check_in && !appt.actual_check_out ? '🟢 Na Creche' :
                                                        appt.actual_check_out ? '✅ Finalizado' :
                                                            '⏳ Aguardando'}
                                                </span>
                                            </div>
                                            {/* Action Buttons Row (Mobile Friendly) */}
                                            {viewMode === 'active' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingAppointment(appt)
                                                        }}
                                                        title="Editar"
                                                        style={{
                                                            background: 'var(--bg-tertiary)',
                                                            border: '1px solid var(--card-border)',
                                                            borderRadius: '4px',
                                                            padding: '4px 8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            fontSize: '0.9rem',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDelete(appt.id)
                                                        }}
                                                        title="Excluir"
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '4px 8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            fontSize: '0.9rem',
                                                            color: '#fca5a5'
                                                        }}
                                                    >
                                                        🗑️ Excluir
                                                    </button>
                                                </div>
                                            )}
                                            <span className={styles.tutorName}>👤 {appt.pets?.customers?.name || 'Cliente'}</span>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                📅 {new Date(appt.scheduled_at).toLocaleDateString('pt-BR', {
                                                    weekday: 'short',
                                                    day: '2-digit',
                                                    month: 'short'
                                                })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                <span>{appt.services?.name || 'Creche'}</span>
                                                {(appt.is_package || appt.package_credit_id) && (
                                                    <span style={{
                                                        background: appt.is_subscription ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                                        color: appt.is_subscription ? '#10b981' : '#8b5cf6',
                                                        borderRadius: '6px',
                                                        padding: '1px 6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.02em',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {appt.session_number && appt.total_sessions
                                                            ? `${appt.is_subscription ? '🔄' : '📦'} Sessão ${appt.session_number} de ${appt.total_sessions}`
                                                            : `${appt.is_subscription ? '🔄 MENSALIDADE' : '📦 PACOTE'}`}
                                                    </span>
                                                )}
                                            </div>
                                            <PaymentControls
                                                appointmentId={appt.id}
                                                calculatedPrice={(appt as any).calculated_price ?? (appt.services as any)?.base_price ?? null}
                                                finalPrice={(appt as any).final_price}
                                                discountPercent={appt.discount_percent}
                                                discountType={appt.discount_type}
                                                discountFixed={appt.discount}
                                                paymentStatus={appt.payment_status}
                                                paymentMethod={(appt as any).payment_method}
                                                isPackage={appt.is_subscription || appt.is_package || !!appt.package_credit_id}
                                                isSubscription={appt.is_subscription}
                                                totalPaid={paidMap[appt.id] || 0}
                                                onUpdate={(newStatus) => {
                                                    fetchCrecheData(true)
                                                    // Se acabou de pagar COMPLETAMENTE, abrir modal de NF
                                                    if (newStatus === 'paid') {
                                                        setNfAppointment(appt)
                                                        setShowNFModal(true)
                                                    }
                                                }}
                                            compact
                                        />
                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                🕐 Agendado: {new Date(new Date(appt.scheduled_at).getTime() + (appt.is_subscription ? 3 * 60 * 60 * 1000 : 0)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {appt.actual_check_in && (
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Entrada: {new Date(new Date(appt.actual_check_in).getTime() + (appt.is_subscription ? 3 * 60 * 60 * 1000 : 0)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {appt.actual_check_out && (
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Saída: {new Date(new Date(appt.actual_check_out).getTime() + (appt.is_subscription ? 3 * 60 * 60 * 1000 : 0)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {appt.payment_status === 'paid' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                    {planFeatures.includes('nota_fiscal') && !nfMap[appt.id] ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNfAppointment(appt);
                                                                setShowNFModal(true);
                                                            }}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--card-border)',
                                                                background: 'var(--bg-tertiary)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            🧾 Emitir NF
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <div style={{
                                                                fontSize: '0.7rem',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: nfMap[appt.id].status === 'autorizado' ? '#065f46' : '#92400e',
                                                                color: 'white',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}>
                                                                NF: {nfMap[appt.id].status.toUpperCase()}
                                                            </div>

                                                            {nfMap[appt.id].pdf_url && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        window.open(nfMap[appt.id].pdf_url, '_blank')
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid var(--card-border)',
                                                                        background: 'var(--bg-tertiary)',
                                                                        color: '#10b981',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    📄 Ver NF
                                                                </button>
                                                            )}

                                                            {nfMap[appt.id].status === 'autorizado' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleSendWhatsApp(nfMap[appt.id].ref || '')
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #065f46',
                                                                        background: 'transparent',
                                                                        color: '#34d399',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    📲 Enviar Zap
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    {viewMode === 'active' ? (
                                        <>
                                            {!appt.actual_check_in ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleCheckIn(appt.id)
                                                    }}
                                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                                    📥 Check-in (Entrada)
                                                </button>
                                            ) : !appt.actual_check_out ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleCheckOut(appt.id)
                                                    }}
                                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#F97316', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                                    📤 Check-out (Saída)
                                                </button>
                                            ) : null}
                                        </>
                                    ) : (
                                        <button
                                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#475569', color: '#e2e8f0', cursor: 'pointer', fontWeight: 600 }}>
                                            📜 Ver Relatório do Dia
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Daily Report Modal */}
                {selectedAppointment && (
                    <DailyReportModal
                        appointmentId={selectedAppointment.id}
                        petName={selectedAppointment.pets?.name || 'Pet'}
                        serviceName={selectedAppointment.services?.name || 'Creche'}
                        onClose={() => setSelectedAppointment(null)}
                        onSave={() => {
                            fetchCrecheData()
                            setSelectedAppointment(null)
                        }}
                        readOnly={viewMode === 'history'}
                    />
                )}

                {/* New Appointment Modal */}
                {showNewModal && (
                    <NewCrecheAppointmentModal
                        onClose={() => setShowNewModal(false)}
                        onSave={() => {
                            fetchCrecheData()
                            setShowNewModal(false)
                        }}
                    />
                )}

                {showNFModal && nfAppointment && (
                    <EmitirNFModal
                        tipo="nfse"
                        refId={nfAppointment.id}
                        origemTipo="atendimento"
                        total_amount={nfAppointment.final_price ?? nfAppointment.calculated_price ?? nfAppointment.services?.base_price ?? 0}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={() => {
                            setShowNFModal(false)
                            fetchCrecheData(true)
                        }}
                        servico={{
                            descricao: nfAppointment.services?.name || 'Serviço de Creche',
                            valor: nfAppointment.final_price ?? nfAppointment.calculated_price ?? nfAppointment.services?.base_price ?? 0,
                            codigo: "08.02" // Creche / Alojamento
                        }}
                        tutor={{
                            nome: nfAppointment.pets?.customers?.name || 'Cliente',
                            cpf: (nfAppointment.pets?.customers as any)?.cpf_cnpj,
                            email: (nfAppointment.pets?.customers as any)?.email,
                            endereco: {
                                logradouro: (nfAppointment.pets?.customers as any)?.address || '',
                                bairro: (nfAppointment.pets?.customers as any)?.neighborhood || '',
                                codigo_municipio: (nfAppointment.pets?.customers as any)?.city || ''
                            }
                        }}
                    />
                )}
            </div>
        </PlanGuard>
    )
}

// Inline component for new appointments
function NewCrecheAppointmentModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
    const supabase = createClient()
    const [pets, setPets] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [selectedPetId, setSelectedPetId] = useState('')
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedTime, setSelectedTime] = useState('08:00')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            // Load pets
            const { data: petsData } = await supabase
                .from('pets')
                .select('id, name, species, breed, customers!inner(name, org_id)')
                .eq('customers.org_id', profile.org_id)
                .order('name')
            if (petsData) setPets(petsData as any)

            // Load Creche services only
            const { data: servicesData } = await supabase
                .from('services')
                .select('id, name, base_price, service_categories!inner(name)')
                .eq('org_id', profile.org_id)
                .eq('service_categories.name', 'Creche')
                .order('name')
            if (servicesData) setServices(servicesData)
        }
        loadData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPetId || !selectedServiceId) {
            alert('Selecione um pet e um serviço')
            return
        }

        const formData = new FormData()
        formData.append('petId', selectedPetId)
        formData.append('serviceId', selectedServiceId)
        formData.append('date', selectedDate)
        formData.append('time', selectedTime)
        if (notes) formData.append('notes', notes)

        try {
            const result = await createAppointment({ message: '', success: false }, formData)
            if (result.success) {
                alert('Agendamento criado com sucesso!')
                onSave()
            } else {
                alert('Erro ao criar agendamento: ' + result.message)
            }
        } catch (err: any) {
            console.error(err)
            alert('Erro inesperado: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-secondary)', borderRadius: '16px', width: '90%', maxWidth: '500px',
                padding: '2rem', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--card-border)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Novo Agendamento</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pet *</label>
                        <PetSearchSelect 
                                name="petId"
                                placeholder="Digite o nome do pet..."
                                onSelect={(id) => setSelectedPetId(id)}
                                required
                            />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Serviço *</label>
                        <select required value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                            <option value="">Selecione...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.base_price.toFixed(2)}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Data *</label>
                            <input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Hora *</label>
                            <input type="time" required value={selectedTime} onChange={e => setSelectedTime(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Observações</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose}
                            style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--card-border)', borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', background: '#10B981', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                            {loading ? 'Criando...' : 'Criar Agendamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
