'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import DateRangeFilter, { DateRange, getDateRange } from '@/components/DateRangeFilter'
import { checkInAppointment, checkOutAppointment } from '@/app/actions/checkInOut'
import { deleteAppointment } from '@/app/actions/appointment'
import DailyReportModal from '@/components/DailyReportModal'
import EditAppointmentModal from '@/components/EditAppointmentModal'
import PlanGuard from '@/components/modules/PlanGuard'
import PetSearchSelect from '@/components/ui/PetSearchSelect'
import EmitirNFModal from '@/components/EmitirNFModal'
import AppointmentCard from '@/components/ui/AppointmentCard'

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
    is_subscription?: boolean
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
    const [showNewModal, setShowNewModal] = useState(false)
    const [showNFModal, setShowNFModal] = useState(false)
    const [checkoutNFData, setCheckoutNFData] = useState<any>(null)
    const [nfMap, setNfMap] = useState<Record<string, { id: string, status: string, caminho_pdf?: string, referencia?: string }>>({})
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

    const fetchBanhoTosaData = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            const { data: orgData } = await supabase
                .from('organizations')
                .select('saas_plans(features)')
                .eq('id', profile.org_id)
                .single()
            if (orgData) {
                setPlanFeatures((orgData.saas_plans as any)?.features || [])
            }

            const { start, end } = getDateRange(dateRange, customStartDate, customEndDate)
            const startISO = start.toISOString()
            const endISO = end.toISOString()

            const statusFilter = viewMode === 'active'
                ? ['pending', 'confirmed', 'in_progress']
                : ['done', 'completed']

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
                            is_subscription,
                            total_price
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
                .eq('services.service_categories.name', 'Banho e Tosa')
                .gte('scheduled_at', startISO)
                .lte('scheduled_at', endISO)
                .in('status', statusFilter)
                .order('scheduled_at', { ascending: viewMode === 'active' })

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
                console.error('Error fetching banho e tosa:', error)
            } else if (appts) {
                const apptsTyped = appts as unknown as Appointment[]

                const apptsWithSession = await Promise.all(apptsTyped.map(async (a: any) => {
                    const sessionInfo = a.package_sessions?.[0]
                    const isSubscription = sessionInfo?.customer_packages?.is_subscription || false
                    let sessionNumber = sessionInfo?.session_number || null
                    let totalSessions = null

                    if (isSubscription && sessionInfo?.customer_packages?.id) {
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

                        const { count: currentCount } = await supabase
                            .from('package_sessions')
                            .select('*', { count: 'exact', head: true })
                            .eq('customer_package_id', sessionInfo.customer_packages.id)
                            .gte('scheduled_at', monthStart)
                            .lte('scheduled_at', a.scheduled_at)
                        
                        sessionNumber = currentCount || 1
                    } else if (a.is_package && sessionInfo?.customer_packages?.id) {
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
                        total_sessions: totalSessions,
                        subscription_price: sessionInfo?.customer_packages?.total_price
                    }
                }))

                setAppointments(apptsWithSession)

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
                                caminho_pdf: nf.caminho_pdf,
                                referencia: nf.referencia
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

    useEffect(() => {
        fetchBanhoTosaData()
    }, [fetchBanhoTosaData])

    useEffect(() => {
        const channel = supabase
            .channel('nf-updates-banho')
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
                                caminho_pdf: nf.caminho_pdf,
                                referencia: nf.referencia
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
            fetchBanhoTosaData(true)
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

    const handleCheckOut = async (appointmentId: string, type?: string) => {
        const result = await checkOutAppointment(appointmentId, type)
        if (result.success) {
            alert(result.message)
            fetchBanhoTosaData()
        } else {
            alert(result.message)
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

                <div className={styles.tabs}>
                    <button
                        onClick={() => setViewMode('active')}
                        className={`${styles.tab} ${viewMode === 'active' ? styles.activeTab : ''}`}
                    >
                        Em Aberto / No Banho
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`${styles.tab} ${viewMode === 'history' ? styles.activeTab : ''}`}
                    >
                        📜 Histórico
                    </button>
                </div>

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
                            <AppointmentCard
                                key={appt.id}
                                appt={appt}
                                viewMode={viewMode}
                                paidMap={paidMap}
                                nfMap={nfMap}
                                planFeatures={planFeatures}
                                onCheckIn={handleCheckIn}
                                onCheckOut={handleCheckOut}
                                onDelete={handleDelete}
                                onEdit={(a) => setEditingAppointment(a)}
                                onNFAction={(a) => {
                                    setCheckoutNFData({
                                        id: a.id,
                                        petName: a.pets?.name,
                                        total_amount: a.final_price || a.calculated_price || a.services?.base_price || 0,
                                        tutor: a.pets?.customers ? {
                                            nome: a.pets.customers.name,
                                            cpf: (a.pets.customers as any).cpf_cnpj,
                                            email: (a.pets.customers as any).email || undefined,
                                            endereco: {
                                                logradouro: (a.pets.customers as any).address || '',
                                                bairro: (a.pets.customers as any).neighborhood || '',
                                                codigo_municipio: (a.pets.customers as any).city || ''
                                            }
                                        } : undefined,
                                        servico: {
                                            descricao: a.services?.name || 'Serviço de Banho e Tosa',
                                            valor: a.final_price || a.calculated_price || a.services?.base_price || 0,
                                            codigo: '0508'
                                        },
                                        tutorPhone: (a.pets.customers as any).phone_1
                                    })
                                    setShowNFModal(true)
                                }}
                                onWhatsAppNF={handleSendWhatsApp}
                                onViewReport={(a) => setSelectedAppointment(a)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedAppointment && (
                <DailyReportModal
                    appointment={selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onUpdate={() => fetchBanhoTosaData(true)}
                />
            )}

            {editingAppointment && (
                <EditAppointmentModal
                    appointment={editingAppointment}
                    onClose={() => setEditingAppointment(null)}
                    onUpdate={() => fetchBanhoTosaData(true)}
                />
            )}

            {showNewModal && (
                <EditAppointmentModal
                    appointment={null}
                    defaultCategory="Banho e Tosa"
                    onClose={() => setShowNewModal(false)}
                    onUpdate={() => fetchBanhoTosaData()}
                />
            )}

            {showNFModal && checkoutNFData && (
                <EmitirNFModal
                    isOpen={showNFModal}
                    onClose={() => {
                        setShowNFModal(false)
                        setCheckoutNFData(null)
                    }}
                    data={checkoutNFData}
                />
            )}
        </PlanGuard>
    )
}
