'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../agenda/page.module.css' // Reuse agenda styles for consistency
import { updateAppointmentStatus } from '@/app/actions/appointment'

interface Appointment {
    id: string
    pet_id: string
    service_id: string
    scheduled_at: string
    status: 'pending' | 'confirmed' | 'in_progress' | 'done' | 'canceled' | 'no_show'
    notes: string | null
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

export default function CrechePage() {
    const supabase = createClient()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCrecheData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            // Get Today's Range
            const today = new Date()
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString()
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

            // Fetch Appointments
            const { data: appts, error } = await supabase
                .from('appointments')
                .select(`
                    id, pet_id, service_id, scheduled_at, status, notes,
                    pets ( name, species, breed, customers ( name ) ),
                    services ( 
                        name, 
                        service_categories!inner ( name, color, icon )
                    )
                `)
                .eq('org_id', profile.org_id)
                .eq('services.service_categories.name', 'Creche') // Filter by joined category name
                .gte('scheduled_at', startOfDay)
                .lte('scheduled_at', endOfDay)
                .order('scheduled_at')

            if (error) {
                console.error('Error fetching creche:', error)
            } else if (appts) {
                setAppointments(appts as unknown as Appointment[])
            }

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchCrecheData()
    }, [fetchCrecheData])

    const handleStatusChange = async (id: string, newStatus: 'in_progress' | 'done') => {
        if (!confirm(`Confirmar ${newStatus === 'in_progress' ? 'entrada' : 'saída'} do pet?`)) return

        await updateAppointmentStatus(id, newStatus)
        fetchCrecheData() // Refresh
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>🎾 Creche - Pets do Dia</h1>
                <button className={styles.actionButton} onClick={fetchCrecheData}>↻ Atualizar</button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', color: '#94a3b8' }}>Carregando...</div>
            ) : appointments.length === 0 ? (
                <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    Nenhum pet agendado para a creche hoje.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {appointments.map(appt => (
                        <div key={appt.id} className={styles.appointmentCard} style={{
                            borderLeft: `4px solid ${appt.services.service_categories.color}`,
                            background: appt.status === 'done' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                            opacity: appt.status === 'done' ? 0.7 : 1
                        }}>
                            <div className={styles.cardTop}>
                                <div className={styles.petInfoMain}>
                                    <div className={styles.petAvatar}>{appt.pets.species === 'cat' ? '🐱' : '🐶'}</div>
                                    <div className={styles.petDetails}>
                                        <div className={styles.petName}>
                                            {appt.pets.name}
                                            <span className={styles.statusBadge} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                                {appt.status === 'in_progress' ? '🟢 Na Creche' :
                                                    appt.status === 'done' ? '🏁 Já saiu' :
                                                        '⏳ Aguardando'}
                                            </span>
                                        </div>
                                        <span className={styles.tutorName}>👤 {appt.pets.customers?.name}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                {appt.status === 'confirmed' || appt.status === 'pending' ? (
                                    <button
                                        onClick={() => handleStatusChange(appt.id, 'in_progress')}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        📥 Check-in (Entrada)
                                    </button>
                                ) : appt.status === 'in_progress' ? (
                                    <button
                                        onClick={() => handleStatusChange(appt.id, 'done')}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#F97316', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        📤 Check-out (Saída)
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
