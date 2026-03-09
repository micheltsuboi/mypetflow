'use client'

import { useState, useEffect } from 'react'
import { getHospitalWards, getHospitalBeds, getActiveAdmissions, movePetBed, applyMedicationDose, getAdmissionMedications, updateAdmissionSeverity, sendMedicationAlert } from '@/app/actions/hospital'
import { useRef } from 'react'
import Link from 'next/link'
import AdmitPetModal from '@/components/AdmitPetModal'
import InternmentRecordModal from '@/components/InternmentRecordModal'
import HospitalHistoryModal from '@/components/HospitalHistoryModal'
import DischargeModal from '@/components/DischargeModal'

export default function HospitalDashboard() {
    const [wards, setWards] = useState<any[]>([])
    const [beds, setBeds] = useState<any[]>([])
    const [admissions, setAdmissions] = useState<any[]>([])
    const [medications, setMedications] = useState<Record<string, any[]>>({})

    // UI state
    const [loading, setLoading] = useState(true)
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null) // admissionId
    const [collapsedWards, setCollapsedWards] = useState<Set<string>>(new Set())

    // Drag and Drop
    const [draggedAdmissionId, setDraggedAdmissionId] = useState<string | null>(null)
    const [draggedOriginBed, setDraggedOriginBed] = useState<string | null>(null)
    const [dragOverBedId, setDragOverBedId] = useState<string | null>(null)

    // Modals
    const [showAdmitModal, setShowAdmitModal] = useState<string | null>(null) // bed_id
    const [showRecordModal, setShowRecordModal] = useState<any | null>(null) // admission
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [showDischargeModal, setShowDischargeModal] = useState<any | null>(null) // admission
    const notifiedMeds = useRef<Set<string>>(new Set())

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

        // Agendador para verificar medicações a cada minuto
        const interval = setInterval(async () => {
            const now = new Date()
            admissions.forEach(adm => {
                const meds = medications[adm.id] || []
                meds.forEach(async (m) => {
                    if (m.is_active && m.next_dose_at) {
                        const nextDose = new Date(m.next_dose_at)
                        const diffMin = (nextDose.getTime() - now.getTime()) / (1000 * 60)

                        // Alerta se faltar menos de 15 minutos e não tiver sido notificado
                        if (diffMin <= 15 && diffMin > -30 && !notifiedMeds.current.has(m.id)) {
                            notifiedMeds.current.add(m.id)

                            // 1. Alerta Sonoro/Console (Simulação de Push)
                            console.log(`ALERTA: Dose de ${m.name} para o pet ${adm.pets.name} às ${nextDose.toLocaleTimeString()}`)

                            // 2. Enviar para WhatsApp via Action -> Webhook n8n
                            const vetPhone = adm.veterinarians?.phone
                            if (vetPhone) {
                                await sendMedicationAlert(vetPhone, `🏥 *ALERTA HOSPITALAR*\n\nO pet *${adm.pets.name}* está no horário da medicação:\n💊 *${m.name}* (${m.dosage})\n🕒 Previsto para: ${nextDose.toLocaleTimeString()}\n📍 Leito: ${wards.find(w => w.id === beds.find(b => b.id === adm.bed_id)?.ward_id)?.name} - ${beds.find(b => b.id === adm.bed_id)?.name}`)
                            }
                        }
                    }
                })
            })
        }, 60000)

        return () => clearInterval(interval)
    }, [admissions, medications, wards, beds])

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

    const onUpdateSeverity = async (admissionId: string, severity: string) => {
        // Atualização Otimista
        const oldAdmissions = [...admissions]
        setAdmissions(prev => prev.map(a => a.id === admissionId ? { ...a, severity } : a))
        setUpdatingStatus(admissionId)

        const res = await updateAdmissionSeverity(admissionId, severity)
        setUpdatingStatus(null)

        if (!res.success) {
            alert(res.message || 'Erro ao atualizar gravidade')
            setAdmissions(oldAdmissions)
        } else {
            // Recarrega silenciosamente para alinhar estados complexos (como animações de glow que dependem do server-side state se houver delay)
            loadData(true)
        }
    }

    const onApplyDose = async (medId: string, admId: string) => {
        // Atualização Otimista: Remove a medicação da lista de pendências imediatas na UI
        const oldMeds = { ...medications }
        setMedications(prev => {
            const newMeds = { ...prev }
            if (newMeds[admId]) {
                newMeds[admId] = newMeds[admId].map(m =>
                    m.id === medId ? { ...m, next_dose_at: new Date(Date.now() + 86400000).toISOString() } : m
                )
            }
            return newMeds
        })

        const res = await applyMedicationDose(medId, admId)
        if (!res.success) {
            setMedications(oldMeds)
            alert(res.message || 'Erro ao aplicar dose')
        } else {
            loadData(true)
        }
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowHistoryModal(true)} className="btn btn-primary" style={{ fontFamily: 'var(--font-montserrat)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📂</span> Histórico Completo
                    </button>
                    <Link href="/owner/hospital/config" className="btn btn-secondary" style={{ fontFamily: 'var(--font-montserrat)' }}>
                        ⚙️ Configurar Estrutura
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '2rem', backgroundColor: 'var(--bg-tertiary)' }}>
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
                                            'low': '#7AC9A0',
                                            'medium': '#FABB05',
                                            'high': '#EA4335',
                                            'critical': '#D46B6B'
                                        };

                                        const severityGlows: any = {
                                            'low': 'rgba(122, 201, 160, 0.05)',
                                            'medium': 'rgba(250, 187, 5, 0.12)',
                                            'high': 'rgba(234, 67, 53, 0.18)',
                                            'critical': 'rgba(212, 107, 107, 0.25)'
                                        };

                                        return (
                                            <div
                                                key={bed.id}
                                                className={`card p-0 flex flex-col overflow-hidden relative group transition-all duration-300 ${adm.severity === 'critical' ? 'animate-critical' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, adm.id, bed.id)}
                                                style={{
                                                    border: `1px solid ${severityColors[adm.severity]}`,
                                                    background: `linear-gradient(180deg, ${severityGlows[adm.severity]} 0%, rgba(22, 38, 56, 1) 100%)`,
                                                    boxShadow: adm.severity === 'critical' ? '0 0 50px rgba(212, 107, 107, 0.4)' : adm.severity === 'high' ? '0 0 30px rgba(234, 67, 53, 0.2)' : 'var(--shadow-lg)',
                                                    position: 'relative'
                                                }}
                                            >
                                                {/* Faixa Superior de Gravidade (Thicker para maior destaque) */}
                                                <div className="h-2 w-full relative z-30" style={{ backgroundColor: severityColors[adm.severity] }} />

                                                {/* Efeito Glow para Gravidade Alta */}
                                                {(adm.severity === 'high' || adm.severity === 'critical') && (
                                                    <div className="absolute inset-0 z-10 pointer-events-none animate-glow" style={{ boxShadow: `inset 0 0 30px ${severityColors[adm.severity]}30` }} />
                                                )}

                                                {/* Header Integrado com Faixa Escura */}
                                                <div className="relative z-20">
                                                    <div className="absolute inset-0 bg-navy-dark/70 backdrop-blur-md transition-all group-hover:bg-navy-dark/90" />
                                                    <div className="flex justify-between items-center px-4 py-2.5 relative z-10 border-b border-white/5">
                                                        <div className="flex items-center">
                                                            <div className="bg-navy-dark border border-white/10 px-2 py-1.5 rounded-sm min-w-[50px] text-center shadow-inner hover:scale-105 transition-transform" title="Identificação do Leito">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-sky" style={{ fontFamily: 'var(--font-montserrat)' }}>
                                                                    {bed.name}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <select
                                                                value={adm.severity}
                                                                onChange={(e) => onUpdateSeverity(adm.id, e.target.value)}
                                                                className="text-[9px] uppercase font-black px-3 py-1.5 rounded-full cursor-pointer transition-all border outline-none appearance-none hover:brightness-110"
                                                                style={{
                                                                    fontFamily: 'var(--font-montserrat)',
                                                                    color: severityColors[adm.severity],
                                                                    backgroundColor: `${severityColors[adm.severity]}15`,
                                                                    borderColor: `${severityColors[adm.severity]}40`,
                                                                    textAlign: 'center',
                                                                    minWidth: '94px'
                                                                }}
                                                            >
                                                                <option value="low">🟢 Estável</option>
                                                                <option value="medium">🟡 Moderado</option>
                                                                <option value="high">🟠 Grave</option>
                                                                <option value="critical">🔴 Crítico</option>
                                                            </select>
                                                            <span className="cursor-grab hover:text-white transition-colors text-[10px] uppercase font-black tracking-widest text-muted" style={{ fontFamily: 'var(--font-montserrat)' }} title="Arrastar Pet para outro leito">
                                                                🖐️ <span className="hidden sm:inline">Mover</span>
                                                            </span>
                                                        </div>
                                                        {updatingStatus === adm.id && (
                                                            <div className="absolute top-10 right-4 animate-spin text-sky text-xs font-bold">
                                                                ⏳
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 pt-4 flex flex-col flex-1 gap-4 relative z-20">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            {pet.photo_url ? (
                                                                <img src={pet.photo_url} alt={pet.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 p-0.5" />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-full bg-navy-light/30 flex items-center justify-center text-2xl border border-white/10">
                                                                    {pet.species === 'cat' ? '🐱' : '🐶'}
                                                                </div>
                                                            )}
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-navy-dark flex items-center justify-center text-[10px] border border-white/20">
                                                                {pet.species === 'dog' ? '🦴' : '🐟'}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <h3 className="text-lg font-black text-white m-0 truncate leading-tight tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>{pet.name}</h3>
                                                            <p className="text-[11px] text-sky/80 m-0 truncate font-semibold" style={{ fontFamily: 'var(--font-montserrat)' }}>{pet.breed || 'SRD'} • {pet.weight_kg}kg</p>
                                                            <p className="text-[10px] text-muted m-0 mt-0.5 truncate italic" style={{ fontFamily: 'var(--font-montserrat)' }}>Tutor: {pet.customers?.name}</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-navy-dark/30 p-3 rounded-lg border border-white/5 group-hover:bg-navy-dark/50 transition-colors">
                                                        <strong className="block text-[8px] uppercase tracking-[0.2em] text-coral mb-1 font-black" style={{ fontFamily: 'var(--font-montserrat)' }}>Motivo do Internamento</strong>
                                                        <p className="text-[11px] text-secondary line-clamp-2 leading-snug" style={{ fontFamily: 'var(--font-montserrat)' }}>{adm.reason || 'Não informado'}</p>
                                                    </div>

                                                    <div className="mt-auto">
                                                        {nextMeds.length > 0 ? (
                                                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 animate-pulse">
                                                                <span className="text-sm">⏰</span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] uppercase font-black text-orange-400 tracking-wider">Próxima Medicação</span>
                                                                    <span className="text-[10px] text-white font-bold truncate">{nextMeds[0].name}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                                <span className="text-sm">✅</span>
                                                                <span className="text-[10px] text-muted font-medium italic">Sem pendências imediatas</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 p-3 gap-2 bg-black/20 mt-2 backdrop-blur-sm relative z-20">
                                                    <button className="btn btn-outline border-white/10 hover:bg-white/5 !text-[10px] !py-2 !px-3 font-black uppercase tracking-tighter" style={{ minHeight: '36px', fontFamily: 'var(--font-montserrat)' }} onClick={() => setShowRecordModal(adm)}>
                                                        🩺 Prontuário
                                                    </button>
                                                    <div className="flex gap-1">
                                                        {nextMeds.length > 0 && (
                                                            <button className="flex-1 btn btn-primary !text-[10px] !py-2 !px-2 font-black uppercase tracking-tighter" style={{ minHeight: '36px', fontFamily: 'var(--font-montserrat)' }} onClick={() => onApplyDose(nextMeds[0].id, adm.id)}>
                                                                💉 Aplicar
                                                            </button>
                                                        )}
                                                        <button className={`btn ${nextMeds.length > 0 ? 'w-12' : 'flex-1'} bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 !text-[10px] !py-2 !px-2 font-black uppercase tracking-tighter`} style={{ minHeight: '36px', fontFamily: 'var(--font-montserrat)' }} onClick={() => setShowDischargeModal(adm)}>
                                                            Alta
                                                        </button>
                                                    </div>
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
                    onClose={() => setShowRecordModal(null)}
                    onSuccess={() => {
                        loadData(true)
                    }}
                />
            )}

            {showHistoryModal && (
                <HospitalHistoryModal onClose={() => setShowHistoryModal(false)} />
            )}

            {showDischargeModal && (
                <DischargeModal
                    admission={showDischargeModal}
                    onClose={() => setShowDischargeModal(null)}
                    onSuccess={() => {
                        setShowDischargeModal(null)
                        loadData()
                    }}
                />
            )}
        </div>
    )
}
