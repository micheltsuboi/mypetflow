'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../agenda/page.module.css'
import Link from 'next/link'
import DateRangeFilter, { DateRange, getDateRange } from '@/components/DateRangeFilter'
import { checkInAppointment, checkOutAppointment } from '@/app/actions/checkInOut'
import DailyReportModal from '@/components/DailyReportModal'

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
        service_categories: { name: string, color: string, icon: string }
    }
}

export default function BanhoTosaPage() {
    const supabase = createClient()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange>('today')
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

    const fetchBanhoTosaData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            // Get Date Range based on filter
            const { start, end } = getDateRange(dateRange)
            const startISO = start.toISOString()
            const endISO = end.toISOString()

            // Fetch Appointments
            const { data: appts, error } = await supabase
                .from('appointments')
                .select(`
                    id, pet_id, service_id, scheduled_at, status, notes,
                    actual_check_in, actual_check_out,
                    pets ( name, species, breed, customers ( name ) ),
                    services ( 
                        name, 
                        service_categories!inner ( name, color, icon )
                    )
                `)
                .eq('org_id', profile.org_id)
                .eq('services.service_categories.name', 'Banho e Tosa')
                .gte('scheduled_at', startISO)
                .lte('scheduled_at', endISO)
                .in('status', ['pending', 'confirmed', 'in_progress'])
                .order('scheduled_at')

            if (error) {
                console.error('Error fetching banho e tosa:', error)
            } else if (appts) {
                setAppointments(appts as unknown as Appointment[])
            }

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [supabase, dateRange])

    useEffect(() => {
        fetchBanhoTosaData()
    }, [fetchBanhoTosaData])

    const handleCheckIn = async (appointmentId: string) => {
        const result = await checkInAppointment(appointmentId)
        if (result.success) {
            alert(result.message)
            fetchBanhoTosaData()
        } else {
            alert(result.message)
        }
    }

    const handleCheckOut = async (appointmentId: string) => {
        const result = await checkOutAppointment(appointmentId)
        if (result.success) {
            alert(result.message)
            fetchBanhoTosaData()
        } else {
            alert(result.message)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>🛁 Banho e Tosa</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/owner/agenda?mode=new&category=Banho e Tosa" className={styles.actionButton} style={{ textDecoration: 'none', background: 'var(--primary)', color: 'white' }}>
                        + Novo Agendamento
                    </Link>
                    <button className={styles.actionButton} onClick={fetchBanhoTosaData}>↻ Atualizar</button>
                </div>
            </div>

            {/* Date Range Filter */}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            {loading ? (
                <div style={{ padding: '2rem', color: '#94a3b8' }}>Carregando...</div>
            ) : appointments.length === 0 ? (
                <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    Nenhum pet agendado para banho e tosa no período selecionado.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {appointments.map(appt => (
                        <div
                            key={appt.id}
                            className={styles.appointmentCard}
                            onClick={() => setSelectedAppointment(appt)}
                            style={{
                                borderLeft: `4px solid ${appt.services?.service_categories?.color || '#2563EB'}`,
                                background: 'var(--bg-secondary)',
                                opacity: 1,
                                cursor: 'pointer'
                            }}>
                            <div className={styles.cardTop}>
                                <div className={styles.petInfoMain}>
                                    <div className={styles.petAvatar}>{appt.pets?.species === 'cat' ? '🐱' : '🐶'}</div>
                                    <div className={styles.petDetails}>
                                        <div className={styles.petName}>
                                            {appt.pets?.name || 'Pet'}
                                            <span className={styles.statusBadge} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                                {appt.actual_check_in && !appt.actual_check_out ? '🟢 Em Atendimento' :
                                                    appt.actual_check_out ? '✅ Concluído' :
                                                        '⏳ Aguardando'}
                                            </span>
                                        </div>
                                        <span className={styles.tutorName}>👤 {appt.pets?.customers?.name || 'Cliente'}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {appt.services?.name || 'Serviço'}
                                        </span>
                                        {appt.actual_check_in && (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Início: {new Date(appt.actual_check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                        {appt.actual_check_out && (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Término: {new Date(appt.actual_check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCheckOut(appt.id)
                                        }}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                        ✅ Finalizar Atendimento
                                    </button>
                                ) : null}
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
                    serviceName={selectedAppointment.services?.name || 'Banho e Tosa'}
                    onClose={() => setSelectedAppointment(null)}
                    onSave={() => {
                        fetchBanhoTosaData()
                        setSelectedAppointment(null)
                    }}
                />
            )}
        </div>
    )
}
