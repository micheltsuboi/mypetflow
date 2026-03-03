'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './page.module.css'
import { getVetDashboardAppointments, startConsultation } from '@/app/actions/veterinary'
import ConsultationModal from '@/components/modules/ConsultationModal'
import PlanGuard from '@/components/modules/PlanGuard'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ConsultasPage() {
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'day' | 'week' | 'month'>('month')
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null)
    const [showModal, setShowModal] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const data = await getVetDashboardAppointments()
        setAppointments(data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleStartConsultation = async (apptId: string) => {
        const res = await startConsultation(apptId)
        if (res.success) {
            setSelectedConsultation(res.data)
            setShowModal(true)
        } else {
            alert(res.message)
        }
    }

    const filteredAppointments = appointments.filter(appt => {
        const petName = appt.pets?.name?.toLowerCase() || ''
        const ownerName = appt.pets?.customers?.name?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()
        return petName.includes(search) || ownerName.includes(search)
    })

    return (
        <PlanGuard requiredModule="clinica_vet">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>🩺 Consultas Veterinárias</h1>
                        <p className={styles.subtitle}>Gerencie os atendimentos clínicos e prontuários.</p>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBar}>
                        <input
                            type="text"
                            placeholder="Buscar pet ou tutor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loading}>Carregando atendimentos...</div>
                ) : (
                    <div className={styles.list}>
                        {filteredAppointments.length === 0 ? (
                            <div className={styles.empty}>Nenhum agendamento encontrado.</div>
                        ) : (
                            filteredAppointments.map(appt => (
                                <div key={appt.id} className={styles.card}>
                                    <div className={styles.cardDate}>
                                        <span className={styles.day}>{format(new Date(appt.scheduled_at), 'dd')}</span>
                                        <span className={styles.month}>{format(new Date(appt.scheduled_at), 'MMM', { locale: ptBR })}</span>
                                        <span className={styles.time}>{format(new Date(appt.scheduled_at), 'HH:mm')}</span>
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <div className={styles.petAvatar}>{appt.pets?.species === 'cat' ? '🐱' : '🐶'}</div>
                                        <div className={styles.details}>
                                            <h3>{appt.pets?.name}</h3>
                                            <p className={styles.owner}>{appt.pets?.customers?.name}</p>
                                            <span className={styles.serviceName}>{appt.services?.name}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardStatus}>
                                        <span className={`${styles.statusBadge} ${styles[appt.status]}`}>
                                            {appt.status === 'pending' ? 'Pendente' :
                                                appt.status === 'confirmed' ? 'Confirmado' :
                                                    appt.status === 'in_progress' ? 'Em Atendimento' : 'Finalizado'}
                                        </span>
                                    </div>
                                    <div className={styles.cardActions}>
                                        {appt.has_consultation ? (
                                            <button
                                                className={styles.openBtn}
                                                onClick={() => handleStartConsultation(appt.id)}
                                            >
                                                📝 Abrir Prontuário
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.startBtn}
                                                onClick={() => handleStartConsultation(appt.id)}
                                            >
                                                🚀 Iniciar Consulta
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {showModal && selectedConsultation && (
                    <ConsultationModal
                        consultation={selectedConsultation}
                        onClose={() => {
                            setShowModal(false)
                            fetchData()
                        }}
                        onSave={fetchData}
                    />
                )}
            </div>
        </PlanGuard>
    )
}
