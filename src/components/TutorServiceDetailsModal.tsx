'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './TutorServiceDetailsModal.module.css'

interface TutorServiceDetailsModalProps {
    appointmentId: string
    onClose: () => void
}

interface AppointmentDetails {
    id: string
    scheduled_at: string
    started_at: string | null
    completed_at: string | null
    status: string
    notes: string | null
    checklist: any[]
    services: { name: string, category: string }
    pets: { name: string }
}

interface TimelineEvent {
    id: string
    type: 'photo' | 'text'
    observation: string
    photo_url: string | null
    created_at: string
}

export default function TutorServiceDetailsModal({ appointmentId, onClose }: TutorServiceDetailsModalProps) {
    const supabase = createClient()
    const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                // 1. Appointment
                const { data: apptData } = await supabase
                    .from('appointments')
                    .select('id, scheduled_at, started_at, completed_at, status, notes, checklist, services(name, category), pets(name)')
                    .eq('id', appointmentId)
                    .single()

                if (apptData) setAppointment(apptData as any)

                // 2. Daily Report Summary
                const { data: reportData } = await supabase
                    .from('appointment_daily_reports')
                    .select('*')
                    .eq('appointment_id', appointmentId)
                    .single()

                if (reportData) {
                    const events: TimelineEvent[] = []

                    if (reportData.report_text) {
                        events.push({
                            id: 'report_text',
                            type: 'text',
                            observation: reportData.report_text,
                            photo_url: null,
                            created_at: reportData.created_at
                        })
                    }

                    if (reportData.photos && reportData.photos.length > 0) {
                        reportData.photos.forEach((url: string, idx: number) => {
                            events.push({
                                id: `photo_${idx}`,
                                type: 'photo',
                                observation: '',
                                photo_url: url,
                                created_at: reportData.created_at
                            })
                        })
                    }

                    setTimeline(events)
                }

            } catch (error) {
                console.error('Error fetching details:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [appointmentId, supabase])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-coral)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        </div>
    )

    if (!appointment) return null

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Detalhes do Serviço</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.serviceInfo}>
                        <div className={styles.serviceHeader}>
                            <h1 className={styles.serviceName}>{appointment.services.name}</h1>
                            <span className={`${styles.badge} ${styles['status_' + appointment.status]}`}>
                                {appointment.status}
                            </span>
                        </div>

                        <div className={styles.details}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Pet</span>
                                <span className={styles.detailValue}>{appointment.pets.name}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Data</span>
                                <span className={styles.detailValue}>{formatDate(appointment.scheduled_at)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Início</span>
                                <span className={styles.detailValue}>
                                    {appointment.started_at ? formatTime(appointment.started_at) : '--:--'}
                                </span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Fim</span>
                                <span className={styles.detailValue}>
                                    {appointment.completed_at ? formatTime(appointment.completed_at) : '--:--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {appointment.checklist && appointment.checklist.length > 0 && (
                        <div className={styles.checklist}>
                            <h3 className={styles.sectionTitle}>✅ Lista de Tarefas</h3>
                            <div className={styles.checkGrid}>
                                {appointment.checklist.map((item: any, idx: number) => {
                                    const label = item.text || item.label || item.item || 'Item'
                                    const completed = item.completed ?? item.checked ?? item.done ?? false
                                    return (
                                        <div key={idx} className={`${styles.checkItem} ${completed ? styles.completed : ''}`}>
                                            <div className={styles.checkDot} />
                                            <span>{label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className={styles.timelineSection}>
                        <h3 className={styles.sectionTitle}>📸 Fotos e Atualizações</h3>
                        {timeline.length > 0 ? (
                            <div className={styles.timeline}>
                                {timeline.map(event => (
                                    <div key={event.id} className={styles.timelineItem}>
                                        <div className={styles.timelineDot} />
                                        <div className={styles.timelineContent}>
                                            {event.type === 'text' && <p>{event.observation}</p>}
                                            {event.type === 'photo' && event.photo_url && (
                                                <div className={styles.timelinePhoto}>
                                                    <img src={event.photo_url} alt="Foto do momento" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Nenhuma atualização de fotos disponível.
                            </p>
                        )}
                    </div>

                    {appointment.notes && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3 className={styles.sectionTitle}>📝 Observações Gerais</h3>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                                <p>{appointment.notes}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
