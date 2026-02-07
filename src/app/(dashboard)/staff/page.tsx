'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import TimeClock from '@/components/modules/TimeClock'
import ServiceModal from '@/components/modules/ServiceModal'
import CreditAlerts from '@/components/modules/CreditAlerts'

type ServiceArea = 'all' | 'banho_tosa' | 'creche' | 'hotel'

// Tipos temporários para mock
interface Pet {
    id: string
    name: string
    species: 'dog' | 'cat'
    breed: string
    photo_url: string | null
    customer_name: string
}

interface Appointment {
    id: string
    pet: Pet
    service_name: string
    service_area: ServiceArea
    scheduled_at: string
    status: 'pending' | 'confirmed' | 'in_progress' | 'done' | 'canceled'
    notes: string | null
    perfume_allowed: boolean
    accessories_allowed: boolean
}

// Mock data para demonstração
const mockAppointments: Appointment[] = [
    {
        id: '1',
        pet: {
            id: 'p1',
            name: 'Thor',
            species: 'dog',
            breed: 'Golden Retriever',
            photo_url: null,
            customer_name: 'Maria Silva'
        },
        service_name: 'Banho + Tosa',
        service_area: 'banho_tosa',
        scheduled_at: new Date().toISOString(),
        status: 'confirmed',
        notes: 'Cuidado com as orelhas, sensíveis',
        perfume_allowed: true,
        accessories_allowed: true
    },
    {
        id: '2',
        pet: {
            id: 'p2',
            name: 'Luna',
            species: 'cat',
            breed: 'Persa',
            photo_url: null,
            customer_name: 'João Santos'
        },
        service_name: 'Banho',
        service_area: 'banho_tosa',
        scheduled_at: new Date().toISOString(),
        status: 'in_progress',
        notes: null,
        perfume_allowed: false,
        accessories_allowed: true
    },
    {
        id: '3',
        pet: {
            id: 'p3',
            name: 'Max',
            species: 'dog',
            breed: 'Bulldog Francês',
            photo_url: null,
            customer_name: 'Ana Costa'
        },
        service_name: 'Tosa Higiênica',
        service_area: 'banho_tosa',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
        notes: 'Primeira vez no pet shop',
        perfume_allowed: true,
        accessories_allowed: false
    },
    {
        id: '4',
        pet: {
            id: 'p4',
            name: 'Bella',
            species: 'dog',
            breed: 'Poodle',
            photo_url: null,
            customer_name: 'Pedro Lima'
        },
        service_name: 'Creche Diária',
        service_area: 'creche',
        scheduled_at: new Date().toISOString(),
        status: 'in_progress',
        notes: null,
        perfume_allowed: true,
        accessories_allowed: true
    },
    {
        id: '5',
        pet: {
            id: 'p5',
            name: 'Rex',
            species: 'dog',
            breed: 'Labrador',
            photo_url: null,
            customer_name: 'Carlos Souza'
        },
        service_name: 'Hospedagem 3 dias',
        service_area: 'hotel',
        scheduled_at: new Date().toISOString(),
        status: 'in_progress',
        notes: 'Medicação às 18h',
        perfume_allowed: true,
        accessories_allowed: true
    },
    {
        id: '6',
        pet: {
            id: 'p6',
            name: 'Mel',
            species: 'dog',
            breed: 'Shih Tzu',
            photo_url: null,
            customer_name: 'Julia Ferreira'
        },
        service_name: 'Creche Diária',
        service_area: 'creche',
        scheduled_at: new Date().toISOString(),
        status: 'in_progress',
        notes: null,
        perfume_allowed: true,
        accessories_allowed: true
    }
]

const statusLabels: Record<string, string> = {
    pending: 'Aguardando',
    confirmed: 'Confirmado',
    in_progress: 'Em Atendimento',
    done: 'Finalizado',
    canceled: 'Cancelado'
}

const statusColors: Record<string, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    in_progress: 'inProgress',
    done: 'done',
    canceled: 'canceled'
}

const areaLabels: Record<ServiceArea, string> = {
    all: 'Todas',
    banho_tosa: '🛁 Banho + Tosa',
    creche: '🐕 Creche',
    hotel: '🏨 Hotel'
}

export default function StaffPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [filter, setFilter] = useState<string>('all')
    const [areaFilter, setAreaFilter] = useState<ServiceArea>('all')
    const [loading, setLoading] = useState(true)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleConfirm = (appointmentId: string) => {
        setAppointments(prev =>
            prev.map(a => a.id === appointmentId ? { ...a, status: 'confirmed' as const } : a)
        )
    }

    const handleStart = (appointmentId: string) => {
        setAppointments(prev =>
            prev.map(a => a.id === appointmentId ? { ...a, status: 'in_progress' as const } : a)
        )
    }

    const handleOpenModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment)
        setIsModalOpen(true)
    }

    const handleComplete = () => {
        if (selectedAppointment) {
            setAppointments(prev =>
                prev.map(a => a.id === selectedAppointment.id ? { ...a, status: 'done' as const } : a)
            )
        }
        setSelectedAppointment(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        // Simular carregamento
        setTimeout(() => {
            setAppointments(mockAppointments)
            setLoading(false)
        }, 500)
    }, [])

    const filteredAppointments = appointments
        .filter(a => areaFilter === 'all' || a.service_area === areaFilter)
        .filter(a => filter === 'all' || a.status === filter)

    const areaBasedAppointments = areaFilter === 'all'
        ? appointments
        : appointments.filter(a => a.service_area === areaFilter)

    const stats = {
        total: areaBasedAppointments.length,
        pending: areaBasedAppointments.filter(a => a.status === 'pending').length,
        inProgress: areaBasedAppointments.filter(a => a.status === 'in_progress').length,
        done: areaBasedAppointments.filter(a => a.status === 'done').length,
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
            {/* Time Clock */}
            <TimeClock />

            {/* Credit Alerts */}
            <CreditAlerts />

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📋</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.total}</span>
                        <span className={styles.statLabel}>Total Hoje</span>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.pending}`}>
                    <div className={styles.statIcon}>⏳</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.pending}</span>
                        <span className={styles.statLabel}>Aguardando</span>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.inProgress}`}>
                    <div className={styles.statIcon}>🛁</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.inProgress}</span>
                        <span className={styles.statLabel}>Em Atendimento</span>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.done}`}>
                    <div className={styles.statIcon}>✅</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.done}</span>
                        <span className={styles.statLabel}>Finalizados</span>
                    </div>
                </div>
            </div>

            {/* Area Filter Tabs */}
            <div className={styles.areaTabs}>
                {(['all', 'banho_tosa', 'creche', 'hotel'] as ServiceArea[]).map(area => (
                    <button
                        key={area}
                        className={`${styles.areaTab} ${areaFilter === area ? styles.active : ''}`}
                        onClick={() => setAreaFilter(area)}
                    >
                        {areaLabels[area]}
                        <span className={styles.areaCount}>
                            {area === 'all'
                                ? appointments.length
                                : appointments.filter(a => a.service_area === area).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                <button
                    className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Todos
                </button>
                <button
                    className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Aguardando
                </button>
                <button
                    className={`${styles.filterTab} ${filter === 'in_progress' ? styles.active : ''}`}
                    onClick={() => setFilter('in_progress')}
                >
                    Em Atendimento
                </button>
                <button
                    className={`${styles.filterTab} ${filter === 'done' ? styles.active : ''}`}
                    onClick={() => setFilter('done')}
                >
                    Finalizados
                </button>
            </div>

            {/* Pets List */}
            <div className={styles.petsList}>
                {filteredAppointments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>🐾</span>
                        <p>Nenhum pet encontrado</p>
                    </div>
                ) : (
                    filteredAppointments.map((appointment) => (
                        <div key={appointment.id} className={styles.petCard}>
                            <div className={styles.petAvatar}>
                                {appointment.pet.photo_url ? (
                                    <img src={appointment.pet.photo_url} alt={appointment.pet.name} />
                                ) : (
                                    <span>{appointment.pet.species === 'dog' ? '🐕' : '🐈'}</span>
                                )}
                            </div>

                            <div className={styles.petInfo}>
                                <div className={styles.petHeader}>
                                    <h3 className={styles.petName}>{appointment.pet.name}</h3>
                                    <span className={`${styles.badge} ${styles[statusColors[appointment.status]]}`}>
                                        {statusLabels[appointment.status]}
                                    </span>
                                </div>
                                <p className={styles.petBreed}>{appointment.pet.breed}</p>
                                <p className={styles.petCustomer}>👤 {appointment.pet.customer_name}</p>
                                <p className={styles.petService}>🎯 {appointment.service_name}</p>

                                {appointment.notes && (
                                    <div className={styles.petNotes}>
                                        <span>📝</span> {appointment.notes}
                                    </div>
                                )}

                                <div className={styles.petTags}>
                                    {appointment.perfume_allowed && (
                                        <span className={styles.tag}>🌸 Perfume OK</span>
                                    )}
                                    {appointment.accessories_allowed && (
                                        <span className={styles.tag}>🎀 Acessórios OK</span>
                                    )}
                                    {!appointment.perfume_allowed && (
                                        <span className={`${styles.tag} ${styles.tagWarning}`}>🚫 Sem Perfume</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.petActions}>
                                {appointment.status === 'confirmed' && (
                                    <button
                                        className={`${styles.actionBtn} ${styles.primary}`}
                                        onClick={() => handleStart(appointment.id)}
                                    >
                                        ▶️ Iniciar
                                    </button>
                                )}
                                {appointment.status === 'in_progress' && (
                                    <>
                                        <button
                                            className={`${styles.actionBtn} ${styles.secondary}`}
                                            onClick={() => handleOpenModal(appointment)}
                                        >
                                            📸 Foto
                                        </button>
                                        <button
                                            className={`${styles.actionBtn} ${styles.success}`}
                                            onClick={() => handleOpenModal(appointment)}
                                        >
                                            ✅ Finalizar
                                        </button>
                                    </>
                                )}
                                {appointment.status === 'pending' && (
                                    <button
                                        className={`${styles.actionBtn} ${styles.outline}`}
                                        onClick={() => handleConfirm(appointment.id)}
                                    >
                                        ✓ Confirmar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Service Modal */}
            <ServiceModal
                appointment={selectedAppointment ? {
                    id: selectedAppointment.id,
                    pet_id: selectedAppointment.pet.id,
                    pet_name: selectedAppointment.pet.name,
                    service_name: selectedAppointment.service_name,
                    customer_name: selectedAppointment.pet.customer_name,
                    notes: selectedAppointment.notes
                } : null}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onComplete={handleComplete}
            />
        </div>
    )
}
