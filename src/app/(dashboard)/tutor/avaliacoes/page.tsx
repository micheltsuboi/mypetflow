'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { getPetAssessment } from '@/app/actions/petAssessment'
import PetAssessmentForm from '@/components/PetAssessmentForm'

interface Pet {
    id: string
    name: string
    species: string
    photo_url: string | null
    breed: string
}

interface AssessmentStatus {
    petId: string
    hasAssessment: boolean
    data?: any
}

export default function AssessmentsPage() {
    const supabase = createClient()
    const [pets, setPets] = useState<Pet[]>([])
    const [assessments, setAssessments] = useState<AssessmentStatus[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
    const [showModal, setShowModal] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Get Customer ID
            const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!customer) return

            // 2. Get Pets
            const { data: petData } = await supabase
                .from('pets')
                .select('*')
                .eq('customer_id', customer.id)
                .eq('is_active', true)
                .order('name')

            if (petData) {
                setPets(petData)

                // 3. Check assessments for each pet
                const statusPromises = petData.map(async (pet) => {
                    const assessment = await getPetAssessment(pet.id)
                    return {
                        petId: pet.id,
                        hasAssessment: !!assessment,
                        data: assessment
                    }
                })

                const statuses = await Promise.all(statusPromises)
                setAssessments(statuses)
            }

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleOpenModal = (pet: Pet) => {
        setSelectedPet(pet)
        setShowModal(true)
    }

    const getStatus = (petId: string) => {
        return assessments.find(a => a.petId === petId)
    }

    if (loading) {
        return <div className={styles.container}>Carregando...</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/tutor" className={styles.backButton}>← Voltar</Link>
                    <h1 className={styles.title}>Avaliações de Saúde</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Necessário para Creche e Hospedagem
                    </p>
                </div>
            </div>

            <div className={styles.list}>
                {pets.map(pet => {
                    const status = getStatus(pet.id)
                    const isDone = status?.hasAssessment

                    return (
                        <div key={pet.id} className={styles.card}>
                            <div className={styles.petInfo}>
                                <div className={styles.avatar}>
                                    {pet.photo_url ? (
                                        <img src={pet.photo_url} alt={pet.name} />
                                    ) : (
                                        <span>{pet.species === 'dog' ? '🐕' : '🐈'}</span>
                                    )}
                                </div>
                                <div className={styles.details}>
                                    <h3>{pet.name}</h3>
                                    <p>{pet.breed}</p>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {isDone ? (
                                            <span className={`${styles.statusBadge} ${styles.done}`}>✅ Avaliação Realizada</span>
                                        ) : (
                                            <span className={`${styles.statusBadge} ${styles.pending}`}>⚠️ Avaliação Pendente</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenModal(pet)}
                                className={`${styles.actionButton} ${isDone ? styles.editButton : ''}`}
                            >
                                {isDone ? 'Editar / Visualizar' : 'Preencher Avaliação'}
                            </button>
                        </div>
                    )
                })}

                {pets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nenhum pet encontrado.
                    </div>
                )}
            </div>

            {showModal && selectedPet && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Avaliação de {selectedPet.name}</h2>
                            <button onClick={() => setShowModal(false)} className={styles.closeButton}>&times;</button>
                        </div>

                        <PetAssessmentForm
                            petId={selectedPet.id}
                            existingData={getStatus(selectedPet.id)?.data}
                            onSuccess={() => {
                                setShowModal(false)
                                fetchData() // Refresh to update status
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
