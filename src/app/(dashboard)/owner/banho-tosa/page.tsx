'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../creche/page.module.css'
import Link from 'next/link'
import DateRangeFilter, { DateRange, getDateRange } from '@/components/DateRangeFilter'
import { checkInAppointment, checkOutAppointment } from '@/app/actions/checkInOut'
import { deleteAppointment } from '@/app/actions/appointment'
import DailyReportModal from '@/components/DailyReportModal'
import PaymentControls from '@/components/PaymentControls'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import ServiceExecutionModal from '@/components/ServiceExecutionModal'
import { createAppointment } from '@/app/actions/appointment'
import PlanGuard from '@/components/modules/PlanGuard'
import PetSearchSelect from '@/components/ui/PetSearchSelect'
import EmitirNFModal from '@/components/EmitirNFModal'

interface Appointment {
    id: string
    pet_id: string
    service_id: string
    scheduled_at: string
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'canceled' | 'no_show'
    notes: string | null
    actual_check_in: string | null
    actual_check_out: string | null
    pets: {
        name: string
        species: string
        breed: string | null
        customers: { name: string }
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
    is_package: boolean | null
    package_credit_id: string | null
    // Info de sessão buscada separadamente
    session_number?: number | null
    total_sessions?: number | null
}

export default function BanhoTosaPage() {
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
    const [submitting, setSubmitting] = useState(false)
    const [pets, setPets] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])

    // NFSe Emission State
    const [showNFModal, setShowNFModal] = useState(false)
    const [checkoutNFData, setCheckoutNFData] = useState<any>(null)
    const [nfMap, setNfMap] = useState<Record<string, any>>({})
    const [planFeatures, setPlanFeatures] = useState<string[]>([])

    const fetchBanhoTosaData = useCallback(async (isBackground = false) => {
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

            // Determine status filter based on viewMode
            const statusFilter = viewMode === 'active'
                ? ['pending', 'confirmed', 'in_progress']
                : ['done', 'completed']

            // Fetch Appointments
            const { data: appts, error } = await supabase
                .from('appointments')
                .select(`
                    id, pet_id, service_id, scheduled_at, status, notes,
                    calculated_price, checklist,
                    final_price, discount_percent, discount_type, discount, payment_status, payment_method,
                    actual_check_in, actual_check_out,
                    is_package, package_credit_id,
                    pets ( 
                        name, species, breed, 
                        customers ( id, name, cpf_cnpj, address, neighborhood, city, email, phone_1 ) 
                    ),
                    services!inner ( 
                        name, 
                        base_price,
                        service_categories!inner ( name, color, icon )
                    )
                `)
                .eq('org_id', profile.org_id)
                .eq('services.service_categories.name', 'Banho e Tosa')
                .gte('scheduled_at', startISO)
                .lte('scheduled_at', endISO)
                .in('status', statusFilter)
                .order('scheduled_at', { ascending: viewMode === 'active' })

            // Load pets and services if not loaded yet
            if (pets.length === 0) {
                const { data: petsData } = await supabase
                    .from('pets')
                    .select('id, name, species, breed, weight_kg, customers!inner(org_id)')
                    .eq('customers.org_id', profile.org_id)
                    .order('name')
                if (petsData) setPets(petsData as any)
            }

            if (services.length === 0) {
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('id, name, base_price, service_categories(id, name)')
                    .eq('org_id', profile.org_id)
                    .order('name')

                // Filter only Banho e Tosa services
                const banhoTosaServices = servicesData?.filter((s: any) =>
                    (s as any).service_categories?.name === 'Banho e Tosa'
                ) || []
                if (banhoTosaServices.length > 0) setServices(banhoTosaServices)
            }

            if (error) {
                console.error('Error fetching banho e tosa:', error)
            } else if (appts) {
                const apptsTyped = appts as unknown as Appointment[]

                // Buscar info de sessão para agendamentos de pacote
                const packageApptIds = apptsTyped.filter(a => a.is_package).map(a => a.id)
                let sessionMap: Record<string, { session_number: number, total_sessions: number }> = {}
                if (packageApptIds.length > 0) {
                    const { data: sessionData } = await supabase
                        .from('package_sessions')
                        .select('appointment_id, session_number, customer_package_id')
                        .in('appointment_id', packageApptIds)
                    
                    if (sessionData && sessionData.length > 0) {
                        // Para cada sessão, buscar o total de sessões do customer_package
                        const cpIds = [...new Set(sessionData.map((s: any) => s.customer_package_id))]
                        const { data: creditData } = await supabase
                            .from('package_credits')
                            .select('customer_package_id, total_quantity')
                            .in('customer_package_id', cpIds)
                        
                        const totalMap: Record<string, number> = {}
                        creditData?.forEach((c: any) => {
                            // Usar o maior total_quantity entre os serviços do pacote
                            if (!totalMap[c.customer_package_id] || c.total_quantity > totalMap[c.customer_package_id]) {
                                totalMap[c.customer_package_id] = c.total_quantity
                            }
                        })

                        sessionData.forEach((s: any) => {
                            if (s.appointment_id) {
                                sessionMap[s.appointment_id] = {
                                    session_number: s.session_number,
                                    total_sessions: totalMap[s.customer_package_id] ?? 0
                                }
                            }
                        })
                    }
                }

                // Mesclar info de sessão nos agendamentos
                const apptsWithSession = apptsTyped.map(a => ({
                    ...a,
                    session_number: sessionMap[a.id]?.session_number ?? null,
                    total_sessions: sessionMap[a.id]?.total_sessions ?? null
                }))

                setAppointments(apptsWithSession)

                // NOVO: Buscar Notas Fiscais para estes agendamentos
                if (apptsTyped.length > 0) {
                    const apptIds = apptsTyped.map(a => a.id)
                    const { data: nfs } = await supabase
                        .from('notas_fiscais')
                        .select('id, status, caminho_pdf, origem_id, referencia')
                        .in('origem_id', apptIds)
                        .eq('origem_tipo', 'atendimento') // Banho e tosa usa tipo atendimento na emissão

                    if (nfs) {
                        // Mapear NFs para os agendamentos (vincular ao objeto no estado se necessário, 
                        // ou manter um estado separado de NF map)
                        setNfMap(current => {
                            const newMap = { ...current }
                            nfs.forEach((nf: any) => {
                                // Preferir o autorizado se houver múltiplos
                                if (!newMap[nf.origem_id] || nf.status === 'autorizado') {
                                    newMap[nf.origem_id] = nf
                                }
                            })
                            return newMap
                        })
                    }
                }
            }

        } catch (error) {
            console.error(error)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }, [supabase, dateRange, customStartDate, customEndDate, viewMode, pets.length, services.length])

    useEffect(() => {
        fetchBanhoTosaData()
    }, [fetchBanhoTosaData])

    // Realtime: atualizar status da NF automaticamente
    useEffect(() => {
        const channel = supabase
            .channel('nf-updates-banho-tosa')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notas_fiscais' },
                (payload: any) => {
                    const nf = payload.new as any
                    if (nf && nf.origem_id) {
                        setNfMap(prev => ({
                            ...prev,
                            [nf.origem_id]: {
                                ...prev[nf.origem_id],
                                ...nf,
                                caminho_pdf: nf.caminho_pdf,
                                referencia: nf.referencia,
                                status: nf.status
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
            // Signal background refresh
            fetchBanhoTosaData(true)

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

    const handleCheckOut = async (appointmentId: string, checkoutType: string) => {
        const result = await checkOutAppointment(appointmentId, checkoutType)
        if (result.success) {
            alert(result.message)
            fetchBanhoTosaData()
        } else {
            alert(result.message)
        }
    }

    const handleSendWhatsApp = async (referencia: string) => {
        try {
            const res = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referencia })
            })
            const data = await res.json()
            if (res.ok) {
                alert('✅ NF enviada com sucesso para o WhatsApp do tutor!')
            } else {
                alert('❌ Erro ao enviar: ' + data.error)
            }
        } catch (error) {
            console.error(error)
            alert('❌ Erro de conexão ao tentar enviar WhatsApp.')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return
        const result = await deleteAppointment(id)
        if (result.success) {
            alert(result.message)
            fetchBanhoTosaData()
        } else {
            alert(result.message)
        }
    }

    return (
        <PlanGuard requiredModule="banho_tosa">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🛁 Banho e Tosa - {viewMode === 'active' ? 'Pets do Dia' : 'Histórico'}</h1>
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
                                onClick={() => fetchBanhoTosaData()}
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
                        Em Aberto / Execução
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
                ) : appointments.length === 0 ? (
                    <div style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        Nenhum pet agendado para banho e tosa no período selecionado.
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {appointments.map(appt => (
                            <div
                                key={appt.id}
                                className={styles.appointmentCard}
                                style={{
                                    borderLeft: `4px solid ${appt.services?.service_categories?.color || '#2563EB'}`,
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
                                    background: appt.services?.service_categories?.color || 'var(--primary)',
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

                                <div className={styles.cardTop} style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                    <div className={styles.petInfoMain} style={{ flex: 1, overflow: 'hidden' }}>
                                        <div className={styles.petAvatar}>{appt.pets?.species === 'cat' ? '🐱' : '🐶'}</div>
                                        <div className={styles.petDetails} style={{ minWidth: 0 }}>
                                            <div className={styles.petName} style={{ flexWrap: 'wrap', cursor: 'pointer' }} onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedAppointment(appt)
                                            }}>
                                                {appt.pets?.name || 'Pet'}
                                                <span className={styles.statusBadge} style={{ fontSize: '0.75rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                                                    {appt.actual_check_in && !appt.actual_check_out ? '🟢 Em Atendimento' :
                                                        appt.actual_check_out ? '✅ Concluído' :
                                                            '⏳ Aguardando'}
                                                </span>
                                            </div>
                                            <span className={styles.tutorName} style={{ cursor: 'pointer' }} onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedAppointment(appt)
                                            }}>👤 {appt.pets?.customers?.name || 'Cliente'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingRight: '0.5rem', flexWrap: 'wrap' }}>
                                                {appt.services?.name || 'Serviço'}
                                                {(appt.is_package || appt.package_credit_id) && (
                                                    <span style={{
                                                        background: 'rgba(139,92,246,0.15)',
                                                        color: '#8b5cf6',
                                                        borderRadius: '6px',
                                                        padding: '1px 6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.02em',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {appt.session_number && appt.total_sessions
                                                            ? `📦 Sessão ${appt.session_number} de ${appt.total_sessions}`
                                                            : '📦 PACOTE'}
                                                    </span>
                                                )}
                                            </span>
                                            <PaymentControls
                                                appointmentId={appt.id}
                                                calculatedPrice={appt.calculated_price ?? appt.services?.base_price ?? null}
                                                finalPrice={appt.final_price}
                                                discountPercent={appt.discount_percent}
                                                discountType={appt.discount_type}
                                                discountFixed={appt.discount}
                                                paymentStatus={appt.payment_status}
                                                paymentMethod={appt.payment_method}
                                                isPackage={appt.is_package}
                                                onUpdate={() => {
                                                    fetchBanhoTosaData(true)
                                                    // Se acabou de pagar, sugerir emitir nota
                                                    if (appt.payment_status !== 'paid') {
                                                        setCheckoutNFData({
                                                            id: appt.id,
                                                            petName: appt.pets?.name,
                                                            total_amount: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                            tutor: appt.pets?.customers ? {
                                                                nome: appt.pets.customers.name,
                                                                cpf: (appt.pets.customers as any).cpf_cnpj,
                                                                email: (appt.pets.customers as any).email || undefined,
                                                                endereco: {
                                                                    logradouro: (appt.pets.customers as any).address || '',
                                                                    bairro: (appt.pets.customers as any).neighborhood || '',
                                                                    codigo_municipio: (appt.pets.customers as any).city || ''
                                                                }
                                                            } : undefined,
                                                            servico: {
                                                                descricao: appt.services?.name || 'Serviço de Banho e Tosa',
                                                                valor: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                                codigo: '0508'
                                                            },
                                                            tutorPhone: (appt.pets.customers as any).phone_1 // NOVO: Corrigido para phone_1
                                                        })
                                                        setShowNFModal(true)
                                                    }
                                                }}
                                                compact
                                             />
                                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                   {appt.payment_status === 'paid' && !nfMap[appt.id] && planFeatures.includes('nota_fiscal') && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCheckoutNFData({
                                                                    id: appt.id,
                                                                    petName: appt.pets?.name, // NOVO: Passando nome do pet
                                                                    total_amount: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                                    tutor: appt.pets?.customers ? {
                                                                        nome: (appt.pets.customers as any).name,
                                                                        cpf: (appt.pets.customers as any).cpf_cnpj,
                                                                        email: (appt.pets.customers as any).email || undefined,
                                                                        endereco: {
                                                                            logradouro: (appt.pets.customers as any).address || '',
                                                                            bairro: (appt.pets.customers as any).neighborhood || '',
                                                                            codigo_municipio: (appt.pets.customers as any).city || ''
                                                                        }
                                                                    } : undefined,
                                                                    servico: {
                                                                        descricao: appt.services?.name || 'Serviço de Banho e Tosa',
                                                                        valor: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                                        codigo: "08.02" // Alojamento, embelezamento, banho, tosa, etc.
                                                                    },
                                                                    tutorPhone: (appt.pets.customers as any).phone_1 // NOVO: Corrigido para phone_1
                                                                });
                                                                setShowNFModal(true);
                                                            }}
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10B981',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                marginTop: '4px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            🧾 Emitir NF
                                                        </button>
                                                   )}

                                                   {nfMap[appt.id] && (
                                                       <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                                           <span 
                                                               className={`${styles.badge}`} 
                                                               style={{ 
                                                                   fontSize: '0.65rem', 
                                                                   padding: '2px 6px',
                                                                   backgroundColor: nfMap[appt.id].status === 'autorizado' ? '#10B981' : 
                                                                                    nfMap[appt.id].status === 'erro' ? '#EF4444' : '#64748B',
                                                                   color: 'white'
                                                               }}
                                                           >
                                                               NF: {nfMap[appt.id].status.toUpperCase()}
                                                           </span>
                                                           {nfMap[appt.id].status === 'autorizado' && nfMap[appt.id].caminho_pdf && (
                                                               <a 
                                                                   href={nfMap[appt.id].caminho_pdf.startsWith('http') ? nfMap[appt.id].caminho_pdf : `https://api.focusnfe.com.br${nfMap[appt.id].caminho_pdf}`}
                                                                   target="_blank"
                                                                   rel="noopener noreferrer"
                                                                   style={{
                                                                       background: 'rgba(59, 130, 246, 0.1)',
                                                                       color: '#3B82F6',
                                                                       border: '1px solid rgba(59, 130, 246, 0.2)',
                                                                       padding: '2px 8px',
                                                                       borderRadius: '4px',
                                                                       fontSize: '0.7rem',
                                                                       fontWeight: 600,
                                                                       textDecoration: 'none',
                                                                       display: 'inline-flex',
                                                                       alignItems: 'center'
                                                                   }}
                                                               >
                                                                   📄 Ver NF
                                                               </a>
                                                           )}
                                                            {nfMap[appt.id].status === 'autorizado' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleSendWhatsApp(nfMap[appt.id].referencia)
                                                                    }}
                                                                    style={{
                                                                        background: 'rgba(37, 211, 102, 0.1)',
                                                                        color: '#25D366',
                                                                        border: '1px solid rgba(37, 211, 102, 0.2)',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    📲 Enviar Zap
                                                                </button>
                                                            )}
                                                            {/* Se deu erro, permitir tentar de novo */}
                                                            {nfMap[appt.id].status === 'erro' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCheckoutNFData({
                                                                            id: appt.id,
                                                                            total_amount: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                                            tutor: appt.pets?.customers ? {
                                                                                nome: (appt.pets.customers as any).name,
                                                                                cpf: (appt.pets.customers as any).cpf_cnpj,
                                                                                email: (appt.pets.customers as any).email || undefined,
                                                                                endereco: {
                                                                                    logradouro: (appt.pets.customers as any).address || '',
                                                                                    bairro: (appt.pets.customers as any).neighborhood || '',
                                                                                    codigo_municipio: (appt.pets.customers as any).city || ''
                                                                                }
                                                                            } : undefined,
                                                                            servico: {
                                                                                descricao: appt.services?.name || 'Serviço de Banho e Tosa',
                                                                                valor: appt.final_price || appt.calculated_price || appt.services?.base_price || 0,
                                                                                codigo: "08.02" // Alojamento, embelezamento, banho, tosa, etc.
                                                                            },
                                                                            tutorPhone: (appt.pets.customers as any).phone_1 // NOVO: Corrigido para phone_1
                                                                        });
                                                                        setShowNFModal(true);
                                                                    }}
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                                        color: '#EF4444',
                                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    🔄 Re-emitir
                                                                </button>
                                                            )}
                                                       </div>
                                                   )}
                                              </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                🕐 Agendado: {new Date(appt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {appt.actual_check_in && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Início: {new Date(appt.actual_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {appt.actual_check_out && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Término: {new Date(appt.actual_check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {viewMode === 'active' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingAppointment(appt)
                                                }}
                                                title="Editar Agendamento"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--card-border)',
                                                    borderRadius: '50%',
                                                    width: '32px',
                                                    height: '32px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(appt.id)
                                                }}
                                                title="Excluir Agendamento"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '32px',
                                                    height: '32px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
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
                                                    🟢 Iniciar Atendimento
                                                </button>
                                            ) : !appt.actual_check_out ? (
                                                <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCheckOut(appt.id, 'a_caminho')
                                                        }}
                                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                                        🚗 A Caminho
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCheckOut(appt.id, 'aguardando_retirada')
                                                        }}
                                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                                        🏠 Aguardando
                                                    </button>
                                                </div>
                                            ) : null}
                                        </>
                                    ) : (
                                        <button
                                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                                            📜 Ver Detalhes do Histórico
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Service Execution Modal (Replacing DailyReport for Banho e Tosa) */}
                {selectedAppointment && (
                    <ServiceExecutionModal
                        appointment={selectedAppointment}
                        onClose={() => setSelectedAppointment(null)}
                        onSave={() => {
                            fetchBanhoTosaData()
                            // Keep open if just checking checklist? No, maybe close or refresh.
                            // Let's refresh data but keep modal open would be ideal, but for now simple refresh.
                            // Actually, if we want to keep working, we should probably refetch the appointment data specifically.
                            // But simplified: close on major actions, refresh on minor.
                        }}
                    />
                )}

                {/* Edit Modal */}
                {editingAppointment && (
                    <EditAppointmentModal
                        appointment={editingAppointment}
                        onClose={() => setEditingAppointment(null)}
                        onSave={() => {
                            fetchBanhoTosaData()
                            setEditingAppointment(null)
                        }}
                    />
                )}

                {/* New Appointment Modal */}
                {showNewModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>Novo Agendamento - Banho e Tosa</h2>
                            <form action={async (formData) => {
                                if (submitting) return
                                setSubmitting(true)
                                try {
                                    const result = await createAppointment({ message: '', success: false }, formData)
                                    if (result.success) {
                                        setShowNewModal(false)
                                        fetchBanhoTosaData()
                                    } else {
                                        alert(result.message)
                                    }
                                } finally {
                                    setSubmitting(false)
                                }
                            }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Pet *</label>
                                    <PetSearchSelect 
                                        name="petId"
                                        placeholder="Digite o nome do pet..."
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Serviço *</label>
                                    <select name="serviceId" className={styles.select} required>
                                        <option value="">Selecione...</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} - R$ {(s.base_price || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Data *</label>
                                        <input name="date" type="date" className={styles.input} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Hora *</label>
                                        <input name="time" type="time" className={styles.input} required />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Observações</label>
                                    <textarea name="notes" className={styles.textarea} rows={3} />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowNewModal(false)}>Cancelar</button>
                                    <button type="submit" className={styles.submitBtn} disabled={submitting}>{submitting ? 'Agendando...' : 'Agendar'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* NFSe Modal */}
                {showNFModal && checkoutNFData && (
                    <EmitirNFModal
                        tipo="nfse"
                        origemTipo="atendimento"
                        refId={checkoutNFData.id}
                        total_amount={checkoutNFData.total_amount}
                        tutor={checkoutNFData.tutor}
                        servico={checkoutNFData.servico}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={(status) => {
                            alert(`Nota Fiscal de Serviço solicitada! Status: ${status}`)
                            setShowNFModal(false)
                            fetchBanhoTosaData(true)
                        }}
                    />
                )}
            </div>
        </PlanGuard>
    )
}
