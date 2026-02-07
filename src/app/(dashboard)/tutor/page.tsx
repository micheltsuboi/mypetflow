'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

// Mock data para demonstração
interface Pet {
    id: string
    name: string
    species: 'dog' | 'cat'
    breed: string
    photo_url: string | null
    weight_kg: number
}

interface TimelineEvent {
    id: string
    type: 'photo' | 'status' | 'feeding' | 'activity' | 'health'
    content: string
    photo_url: string | null
    timestamp: string
    staff_name: string
}

interface CurrentAppointment {
    id: string
    service_name: string
    status: 'pending' | 'confirmed' | 'in_progress' | 'done'
    scheduled_at: string
    started_at: string | null
}

const mockPet: Pet = {
    id: 'p1',
    name: 'Thor',
    species: 'dog',
    breed: 'Golden Retriever',
    photo_url: null,
    weight_kg: 32
}

const mockAppointment: CurrentAppointment = {
    id: 'a1',
    service_name: 'Banho + Tosa',
    status: 'in_progress',
    scheduled_at: new Date().toISOString(),
    started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 min atrás
}

const mockTimeline: TimelineEvent[] = [
    {
        id: '1',
        type: 'status',
        content: 'Thor chegou e foi recebido pela equipe! 🐾',
        photo_url: null,
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        staff_name: 'Tainara'
    },
    {
        id: '2',
        type: 'photo',
        content: 'Começando o banho! Olha que fofo 🛁',
        photo_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        staff_name: 'Tainara'
    },
    {
        id: '3',
        type: 'activity',
        content: 'Thor adorou a massagem durante o banho! Muito tranquilo 😊',
        photo_url: null,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        staff_name: 'Tainara'
    },
    {
        id: '4',
        type: 'photo',
        content: 'Secando com carinho 💨',
        photo_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        staff_name: 'Tainara'
    }
]

const statusLabels: Record<string, string> = {
    pending: 'Aguardando',
    confirmed: 'Confirmado',
    in_progress: 'Em Atendimento',
    done: 'Finalizado'
}

const statusColors: Record<string, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    in_progress: 'inProgress',
    done: 'done'
}

const eventIcons: Record<string, string> = {
    photo: '📸',
    status: '📋',
    feeding: '🍽️',
    activity: '🎾',
    health: '💊'
}

export default function TutorPage() {
    const [pet] = useState<Pet>(mockPet)
    const [appointment] = useState<CurrentAppointment | null>(mockAppointment)
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [elapsedTime, setElapsedTime] = useState('')

    useEffect(() => {
        // Simular carregamento
        setTimeout(() => {
            setTimeline(mockTimeline)
            setLoading(false)
        }, 500)
    }, [])

    // Calcular tempo decorrido do atendimento
    useEffect(() => {
        if (!appointment?.started_at) return

        const calculateElapsed = () => {
            const start = new Date(appointment.started_at!)
            const now = new Date()
            const diff = now.getTime() - start.getTime()

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            if (hours > 0) {
                setElapsedTime(`${hours}h ${minutes}min`)
            } else {
                setElapsedTime(`${minutes} min`)
            }
        }

        calculateElapsed()
        const timer = setInterval(calculateElapsed, 60000)
        return () => clearInterval(timer)
    }, [appointment])

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / (1000 * 60))

        if (minutes < 1) return 'Agora'
        if (minutes < 60) return `Há ${minutes} min`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `Há ${hours}h`
        return date.toLocaleDateString('pt-BR')
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {/* Pet Header */}
            <div className={styles.petHeader}>
                <div className={styles.petAvatar}>
                    {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} />
                    ) : (
                        <span>{pet.species === 'dog' ? '🐕' : '🐈'}</span>
                    )}
                </div>
                <div className={styles.petInfo}>
                    <h1 className={styles.petName}>{pet.name}</h1>
                    <p className={styles.petBreed}>{pet.breed} • {pet.weight_kg}kg</p>
                </div>
            </div>

            {/* Current Status Card */}
            {appointment && (
                <div className={styles.statusCard}>
                    <div className={styles.statusHeader}>
                        <span className={`${styles.statusBadge} ${styles[statusColors[appointment.status]]}`}>
                            {appointment.status === 'in_progress' && '🛁 '}
                            {statusLabels[appointment.status]}
                        </span>
                        {elapsedTime && (
                            <span className={styles.elapsedTime}>⏱️ {elapsedTime}</span>
                        )}
                    </div>
                    <h2 className={styles.serviceName}>{appointment.service_name}</h2>
                    <p className={styles.scheduledTime}>
                        Agendado para hoje às {formatTime(appointment.scheduled_at)}
                    </p>

                    {appointment.status === 'in_progress' && (
                        <div className={styles.progressIndicator}>
                            <div className={styles.progressDots}>
                                <span className={styles.dot} />
                                <span className={styles.dot} />
                                <span className={styles.dot} />
                            </div>
                            <p>Seu pet está sendo cuidado com muito carinho!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Timeline */}
            <div className={styles.timelineSection}>
                <h2 className={styles.sectionTitle}>📸 Timeline de Hoje</h2>

                <div className={styles.timeline}>
                    {timeline.map((event, index) => (
                        <div key={event.id} className={styles.timelineItem}>
                            <div className={styles.timelineDot}>
                                <span>{eventIcons[event.type]}</span>
                            </div>
                            {index < timeline.length - 1 && (
                                <div className={styles.timelineLine} />
                            )}

                            <div className={styles.timelineContent}>
                                <div className={styles.timelineHeader}>
                                    <span className={styles.timelineTime}>
                                        {formatRelativeTime(event.timestamp)}
                                    </span>
                                    <span className={styles.staffName}>por {event.staff_name}</span>
                                </div>
                                <p className={styles.timelineText}>{event.content}</p>

                                {event.photo_url && (
                                    <div className={styles.timelinePhoto}>
                                        <img src={event.photo_url} alt="Foto do atendimento" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
                <button className={styles.actionButton}>
                    <span>📞</span>
                    <span>Ligar</span>
                </button>
                <Link href="/tutor/booking" className={styles.actionButton}>
                    <span>📅</span>
                    <span>Agendar</span>
                </Link>
                <Link href="/tutor/gallery" className={styles.actionButton}>
                    <span>🖼️</span>
                    <span>Galeria</span>
                </Link>
            </div>
        </div>
    )
}
