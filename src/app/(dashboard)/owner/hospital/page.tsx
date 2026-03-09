'use client'

import { useState, useEffect } from 'react'
import { getHospitalWards, getHospitalBeds, getActiveAdmissions, movePetBed, applyMedicationDose, dischargePet, getAdmissionMedications } from '@/app/actions/hospital'
import styles from './page.module.css'
import Link from 'next/link'
import AdmitPetModal from '@/components/AdmitPetModal'
import PrescribeMedicationModal from '@/components/PrescribeMedicationModal'

export default function HospitalDashboard() {
    const [wards, setWards] = useState<any[]>([])
    const [beds, setBeds] = useState<any[]>([])
    const [admissions, setAdmissions] = useState<any[]>([])
    const [medications, setMedications] = useState<Record<string, any[]>>({})

    // UI state
    const [loading, setLoading] = useState(true)
    const [collapsedWards, setCollapsedWards] = useState<Set<string>>(new Set())

    // Drag and Drop
    const [draggedAdmissionId, setDraggedAdmissionId] = useState<string | null>(null)
    const [draggedOriginBed, setDraggedOriginBed] = useState<string | null>(null)
    const [dragOverBedId, setDragOverBedId] = useState<string | null>(null)

    // Modals
    const [showAdmitModal, setShowAdmitModal] = useState<string | null>(null) // bed_id
    const [showPrescribeModal, setShowPrescribeModal] = useState<any | null>(null) // admission

    const loadData = async () => {
        setLoading(true)
        const [wData, bData, aData] = await Promise.all([
            getHospitalWards(),
            getHospitalBeds(),
            getActiveAdmissions()
        ])
        setWards(wData)
        setBeds(bData)
        setAdmissions(aData)

        // Load meds for active admissions
        const medsObj: Record<string, any[]> = {}
        for (const adm of aData) {
            medsObj[adm.id] = await getAdmissionMedications(adm.id)
        }
        setMedications(medsObj)
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const toggleWard = (id: string) => {
        const newSet = new Set(collapsedWards)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setCollapsedWards(newSet)
    }

    const handleDragStart = (e: React.DragEvent, admissionId: string, originBedId: string) => {
        setDraggedAdmissionId(admissionId)
        setDraggedOriginBed(originBedId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, targetBedId: string) => {
        e.preventDefault()
        if (targetBedId !== draggedOriginBed) {
            setDragOverBedId(targetBedId)
        }
    }

    const handleDragLeave = () => {
        setDragOverBedId(null)
    }

    const handleDrop = async (e: React.DragEvent, targetBedId: string) => {
        e.preventDefault()
        setDragOverBedId(null)

        if (draggedAdmissionId && draggedOriginBed && targetBedId !== draggedOriginBed) {
            // Optimistic update
            const admIndex = admissions.findIndex(a => a.id === draggedAdmissionId)
            const oldAdmissions = [...admissions]
            const oldBeds = [...beds]

            if (admIndex >= 0) {
                const newAdms = [...admissions]
                newAdms[admIndex].bed_id = targetBedId
                setAdmissions(newAdms)

                setBeds(beds.map(b =>
                    b.id === targetBedId ? { ...b, status: 'occupied' } :
                        b.id === draggedOriginBed ? { ...b, status: 'available' } : b
                ))
            }

            const res = await movePetBed(draggedAdmissionId, draggedOriginBed, targetBedId)
            if (!res.success) {
                alert(res.message)
                setAdmissions(oldAdmissions)
                setBeds(oldBeds)
            } else {
                loadData()
            }
        }

        setDraggedAdmissionId(null)
        setDraggedOriginBed(null)
    }

    const onDischarge = async (admissionId: string, bedId: string) => {
        if (confirm('Tem certeza que deseja dar alta para este pet?')) {
            await dischargePet(admissionId, bedId)
            loadData()
        }
    }

    const onApplyDose = async (medId: string, admId: string) => {
        await applyMedicationDose(medId, admId)
        loadData()
    }

    if (loading) return <div className={styles.container}>Carregando mapa hospitalar...</div>

    const totalInternados = admissions.length
    const criticalCount = admissions.filter(a => a.severity === 'critical').length

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Mapa de Leitos (Hospital)</h1>
                <Link href="/owner/hospital/config" className={styles.configButton}>
                    ⚙️ Configurar Setores
                </Link>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Internados Agora</span>
                    <span className={styles.statValue}>{totalInternados}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Pacientes Críticos</span>
                    <span className={styles.statValue} style={{ color: '#DC2626' }}>{criticalCount}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Leitos Disponíveis</span>
                    <span className={styles.statValue} style={{ color: '#10B981' }}>{beds.filter(b => b.status === 'available').length} / {beds.length}</span>
                </div>
            </div>

            {wards.length === 0 ? (
                <div className={styles.emptyState}>
                    Nenhum setor cadastrado. Vá em Configurar Setores para criar o hospital.
                </div>
            ) : (
                wards.map(ward => {
                    const wardBeds = beds.filter(b => b.ward_id === ward.id)
                    const isCollapsed = collapsedWards.has(ward.id)

                    return (
                        <div key={ward.id} className={styles.wardSection}>
                            <div
                                className={styles.wardHeader}
                                style={{ backgroundColor: ward.color }}
                                onClick={() => toggleWard(ward.id)}
                            >
                                <span className={styles.wardTitle}>
                                    {isCollapsed ? '▶' : '▼'} {ward.name} ({wardBeds.filter(b => b.status === 'occupied').length}/{wardBeds.length} ocupados)
                                </span>
                            </div>

                            {!isCollapsed && (
                                <div className={styles.wardBeds}>
                                    {wardBeds.map(bed => {
                                        const adm = admissions.find(a => a.bed_id === bed.id)
                                        const isDragOver = dragOverBedId === bed.id

                                        if (!adm) {
                                            return (
                                                <div
                                                    key={bed.id}
                                                    className={`${styles.bedCard} ${styles.available} ${isDragOver ? styles.dragOver : ''}`}
                                                    onDragOver={(e) => handleDragOver(e, bed.id)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, bed.id)}
                                                >
                                                    <h3 style={{ margin: '0 0 1rem 0', color: '#9CA3AF' }}>{bed.name}</h3>
                                                    <button className={styles.admitButton} onClick={() => setShowAdmitModal(bed.id)}>
                                                        + Internar Pet
                                                    </button>
                                                </div>
                                            )
                                        }

                                        const pet = adm.pets
                                        const nextMeds = (medications[adm.id] || []).filter(m => new Date(m.next_dose_at) <= new Date(Date.now() + 3600000))

                                        return (
                                            <div
                                                key={bed.id}
                                                className={`${styles.bedCard} ${styles.occupied}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, adm.id, bed.id)}
                                            >
                                                <div className={`${styles.severityLED} ${styles[`severity_${adm.severity}`]}`} />

                                                <div className={styles.bedHeader}>
                                                    <span>{bed.name}</span>
                                                    <span className={styles.dragHandle} title="Arrastar">🖐️</span>
                                                </div>

                                                <div className={styles.petInfo}>
                                                    <div className={styles.petIdentity}>
                                                        <div className={styles.petAvatar}>
                                                            {pet.species === 'cat' ? '🐱' : '🐶'}
                                                        </div>
                                                        <div className={styles.petDetails}>
                                                            <h3>{pet.name}</h3>
                                                            <p>{pet.breed} • {pet.weight_kg}kg</p>
                                                            <p style={{ fontSize: '0.75rem', marginTop: '2px' }}>Tutor: {pet.customers?.name}</p>
                                                        </div>
                                                    </div>

                                                    <div style={{ fontSize: '0.875rem', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '0.5rem', borderRadius: '4px' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px' }}>Motivo:</strong>
                                                        {adm.reason}
                                                    </div>

                                                    {nextMeds.length > 0 ? (
                                                        <div className={`${styles.medicationAlert} ${new Date(nextMeds[0].next_dose_at) <= new Date() ? styles.urgent : ''}`}>
                                                            ⏰ Próxima medicação em breve: {nextMeds[0].name}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                                            Sem medicações urgentes.
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={styles.cardActions}>
                                                    <button className={styles.actionBtn} onClick={() => setShowPrescribeModal(adm)}>💊 Prescrever</button>
                                                    {nextMeds.length > 0 && (
                                                        <button className={`${styles.actionBtn} ${styles.primary}`} onClick={() => onApplyDose(nextMeds[0].id, adm.id)}>💉 Dar Dose</button>
                                                    )}
                                                    <button className={styles.actionBtn} onClick={() => onDischarge(adm.id, bed.id)} style={{ color: '#059669', borderColor: '#10B981', backgroundColor: '#ECFDF5' }}>Alta</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })
            )}

            {showAdmitModal && (
                <AdmitPetModal
                    bedId={showAdmitModal}
                    onClose={() => setShowAdmitModal(null)}
                    onSuccess={() => {
                        setShowAdmitModal(null)
                        loadData()
                    }}
                />
            )}

            {showPrescribeModal && (
                <PrescribeMedicationModal
                    admission={showPrescribeModal}
                    medications={medications[showPrescribeModal.id] || []}
                    onClose={() => setShowPrescribeModal(null)}
                    onSuccess={() => {
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
