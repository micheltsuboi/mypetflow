'use client'

import { useState, useEffect } from 'react'
import { getHospitalWards, getHospitalBeds, getActiveAdmissions, movePetBed, applyMedicationDose, dischargePet, getAdmissionMedications } from '@/app/actions/hospital'
import Link from 'next/link'
import AdmitPetModal from '@/components/AdmitPetModal'
import InternmentRecordModal from '@/components/InternmentRecordModal'

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
    const [showRecordModal, setShowRecordModal] = useState<any | null>(null) // admission

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [wData, bData, aData] = await Promise.all([
                getHospitalWards(),
                getHospitalBeds(),
                getActiveAdmissions()
            ])

            setWards(wData)
            setBeds(bData)
            setAdmissions(aData)

            // Optimize: Fetch all medications in parallel
            const medsPromises = aData.map(async (adm) => ({
                id: adm.id,
                meds: await getAdmissionMedications(adm.id)
            }))

            const medsResults = await Promise.all(medsPromises)
            const medsObj: Record<string, any[]> = {}
            medsResults.forEach(res => {
                medsObj[res.id] = res.meds
            })

            setMedications(medsObj)
        } catch (error) {
            console.error('Error loading hospital data:', error)
        } finally {
            setLoading(false)
        }
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
        loadData(true)
    }

    if (loading && wards.length === 0) return (
        <div className="container p-12 text-center animate-pulse">
            <div className="text-4xl mb-4">⚙️</div>
            <p className="text-muted font-bold">Carregando mapa hospitalar...</p>
        </div>
    )

    const totalInternados = admissions.length
    const criticalCount = admissions.filter(a => a.severity === 'critical').length

    return (
        <div className="container p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-coral mb-2" style={{ fontFamily: 'var(--font-montserrat)' }}>Hospital e Leitos</h1>
                    <p className="text-muted" style={{ fontFamily: 'var(--font-montserrat)' }}>Acompanhe os pacientes internados, aplique medicamentos e monitore gravidades.</p>
                </div>
                <Link href="/owner/hospital/config" className="btn btn-secondary" style={{ fontFamily: 'var(--font-montserrat)' }}>
                    ⚙️ Configurar Estrutura
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="card glass text-center p-8 transition-all hover:scale-[1.02] border-navy-light" style={{ borderBottom: '4px solid var(--color-coral)' }}>
                    <span className="text-xs font-bold text-muted uppercase tracking-[0.2em] block mb-3" style={{ fontFamily: 'var(--font-montserrat)' }}>Pacientes Internados</span>
                    <span className="text-4xl font-black text-coral" style={{ fontFamily: 'var(--font-montserrat)' }}>{totalInternados}</span>
                </div>
                <div className="card glass text-center p-8 transition-all hover:scale-[1.02] border-navy-light" style={{ borderBottom: '4px solid var(--status-canceled)' }}>
                    <span className="text-xs font-bold text-muted uppercase tracking-[0.2em] block mb-3" style={{ fontFamily: 'var(--font-montserrat)' }}>Quadros Críticos (UTI)</span>
                    <span className="text-4xl font-black" style={{ color: 'var(--status-canceled)', fontFamily: 'var(--font-montserrat)' }}>{criticalCount}</span>
                </div>
                <div className="card glass text-center p-8 transition-all hover:scale-[1.02] border-navy-light" style={{ borderBottom: '4px solid var(--color-sky)' }}>
                    <span className="text-xs font-bold text-muted uppercase tracking-[0.2em] block mb-3" style={{ fontFamily: 'var(--font-montserrat)' }}>Leitos Disponíveis</span>
                    <span className="text-4xl font-black text-sky" style={{ fontFamily: 'var(--font-montserrat)' }}>{beds.filter(b => b.status === 'available').length} / {beds.length}</span>
                </div>
            </div>

            {wards.length === 0 ? (
                <div className="card text-center p-8 glass animate-fadeIn">
                    <div className="text-4xl mb-4">🏥</div>
                    <h2 className="text-xl font-bold mb-2">Seu hospital ainda não foi configurado</h2>
                    <p className="text-muted mb-6">Para começar a internar pacientes, primeiro crie seus setores (ex: UTI, Internamento Canino) e leitos.</p>
                    <Link href="/owner/hospital/config" className="btn btn-primary">
                        Configurar Primeiro Setor
                    </Link>
                </div>
            ) : (
                wards.map(ward => {
                    const wardBeds = beds.filter(b => b.ward_id === ward.id)
                    const isCollapsed = collapsedWards.has(ward.id)

                    return (
                        <div key={ward.id} className="card glass mb-6 p-0 overflow-hidden" style={{ borderLeft: `6px solid ${ward.color}` }}>
                            <div
                                className="flex justify-between items-center p-4 cursor-pointer transition-colors hover:bg-opacity-20"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                                onClick={() => toggleWard(ward.id)}
                            >
                                <span className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-montserrat)' }}>
                                    {isCollapsed ? '▶' : '▼'}
                                    <span style={{ color: ward.color }}>{ward.name}</span>
                                    <span className="text-sm text-secondary font-normal badge badge-confirmed ml-2" style={{ fontFamily: 'var(--font-montserrat)' }}>
                                        {wardBeds.filter(b => b.status === 'occupied').length} / {wardBeds.length} Ocupados
                                    </span>
                                </span>
                            </div>

                            {!isCollapsed && (
                                <div className="p-8 bg-tertiary grid grid-cols-4 gap-6">
                                    {wardBeds.map(bed => {
                                        const adm = admissions.find(a => a.bed_id === bed.id)
                                        const isDragOver = dragOverBedId === bed.id

                                        if (!adm) {
                                            return (
                                                <div
                                                    key={bed.id}
                                                    className={`card flex flex-col items-center justify-center p-6 transition-transform ${isDragOver ? 'scale-105 border-sky' : ''}`}
                                                    style={{ border: isDragOver ? '2px dashed var(--color-sky)' : '2px dashed rgba(140, 180, 201, 0.2)', backgroundColor: isDragOver ? 'rgba(0, 228, 206, 0.1)' : 'transparent', minHeight: '180px', fontFamily: 'var(--font-montserrat)' }}
                                                    onDragOver={(e) => handleDragOver(e, bed.id)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, bed.id)}
                                                >
                                                    <h3 className="text-lg font-bold text-muted mb-4" style={{ fontFamily: 'var(--font-montserrat)' }}>{bed.name}</h3>
                                                    <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => setShowAdmitModal(bed.id)}>
                                                        + Internar
                                                    </button>
                                                </div>
                                            )
                                        }

                                        const pet = adm.pets
                                        const nextMeds = (medications[adm.id] || []).filter(m => new Date(m.next_dose_at) <= new Date(Date.now() + 3600000))

                                        const severityColors: any = {
                                            'low': 'var(--status-done)',
                                            'medium': 'var(--status-pending)',
                                            'high': 'var(--status-in-progress)',
                                            'critical': 'var(--status-canceled)'
                                        };

                                        return (
                                            <div
                                                key={bed.id}
                                                className="card p-0 flex flex-col overflow-hidden relative"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, adm.id, bed.id)}
                                                style={{ borderTop: `4px solid ${severityColors[adm.severity]}` }}
                                            >
                                                <div className="flex justify-between items-center p-3 bg-secondary border-b" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                                    <span className="font-bold text-sky" style={{ fontFamily: 'var(--font-montserrat)' }}>{bed.name}</span>
                                                    <span className="cursor-grab hover:text-white transition-colors text-[10px] uppercase font-bold tracking-widest text-muted" style={{ fontFamily: 'var(--font-montserrat)' }} title="Arrastar Pet para outro leito">
                                                        🖐️ Mover
                                                    </span>
                                                </div>

                                                <div className="p-4 flex flex-col flex-1 gap-3 bg-tertiary">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center text-2xl bg-primary-light text-navy font-bold rounded-full" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                                            {pet.species === 'cat' ? '🐱' : '🐶'}
                                                        </div>
                                                        <div className="flex flex-col" style={{ minWidth: 0 }}>
                                                            <h3 className="text-md font-bold text-primary m-0 truncate" style={{ fontFamily: 'var(--font-montserrat)' }}>{pet.name}</h3>
                                                            <p className="text-[10px] text-secondary m-0 truncate" style={{ fontFamily: 'var(--font-montserrat)' }}>{pet.breed} • {pet.weight_kg}kg</p>
                                                            <p className="text-[10px] text-muted m-0 mt-1 truncate" style={{ fontFamily: 'var(--font-montserrat)' }}>Tutor: {pet.customers?.name}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-[11px] text-secondary p-2 rounded bg-secondary line-clamp-2" style={{ fontFamily: 'var(--font-montserrat)' }} title={adm.reason}>
                                                        <strong className="block mb-1 text-white uppercase text-[9px] tracking-widest">Motivo:</strong>
                                                        {adm.reason}
                                                    </div>

                                                    {nextMeds.length > 0 ? (
                                                        <div className="text-xs p-2 rounded flex items-center gap-1 font-bold" style={{ backgroundColor: 'rgba(232, 130, 106, 0.1)', color: 'var(--status-pending)', border: '1px solid var(--status-pending)' }}>
                                                            ⏰ Próxima Med.: {nextMeds[0].name}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted p-2 bg-secondary rounded border-dashed border">
                                                            Sem medicações
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex p-3 gap-2 bg-secondary border-t" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                                    <button className="flex-1 btn btn-outline" style={{ padding: '8px 4px', fontSize: '11px', minHeight: '36px' }} onClick={() => setShowRecordModal(adm)}>
                                                        🩺 Prontuário
                                                    </button>
                                                    {nextMeds.length > 0 && (
                                                        <button className="flex-1 btn btn-primary" style={{ padding: '8px 4px', fontSize: '11px', minHeight: '36px' }} onClick={() => onApplyDose(nextMeds[0].id, adm.id)}>
                                                            💉 Aplicar
                                                        </button>
                                                    )}
                                                    <button className="flex-1 btn" style={{ padding: '8px 4px', fontSize: '11px', minHeight: '36px', backgroundColor: 'rgba(122, 201, 160, 0.15)', color: 'var(--status-done)', border: '1px solid var(--status-done)' }} onClick={() => onDischarge(adm.id, bed.id)}>
                                                        Alta
                                                    </button>
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

            {showRecordModal && (
                <InternmentRecordModal
                    admission={showRecordModal}
                    activeMedications={medications[showRecordModal.id] || []}
                    onClose={() => setShowRecordModal(null)}
                    onSuccess={() => {
                        loadData(true)
                    }}
                />
            )}
        </div>
    )
}
