'use client'

import { useState, useEffect } from 'react'
import { movePetBed, getHospitalDashboardData } from '@/app/actions/hospital'

interface MovePetBedModalProps {
    admission: any
    onClose: () => void
    onSuccess: () => void
}

export default function MovePetBedModal({ admission, onClose, onSuccess }: MovePetBedModalProps) {
    const [wards, setWards] = useState<any[]>([])
    const [beds, setBeds] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const loadBeds = async () => {
            setLoading(true)
            const data = await getHospitalDashboardData()
            if (data) {
                setWards(data.wards)
                // Filtrar leitos disponíveis ou o atual
                setBeds(data.beds.filter((b: any) =>
                    b.status === 'available' || b.id === admission.bed_id
                ))
            }
            setLoading(false)
        }
        loadBeds()
    }, [admission.bed_id])

    const handleMove = async (newBedId: string) => {
        if (newBedId === admission.bed_id) return

        setSubmitting(true)
        const res = await movePetBed(admission.id, admission.bed_id, newBedId)
        setSubmitting(false)

        if (res.success) {
            onSuccess()
        } else {
            alert(res.message)
        }
    }

    return (
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-primary" style={{ fontFamily: 'var(--font-montserrat)' }}>Mover Paciente</h2>
                        <p className="text-muted text-sm">Pet: {admission.pets?.name} • Leito Atual: {admission.hospital_beds?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                {loading ? (
                    <div className="text-center p-8">Carregando leitos...</div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {wards.map(ward => {
                            const wardBeds = beds.filter(b => b.ward_id === ward.id)
                            if (wardBeds.length === 0) return null

                            return (
                                <div key={ward.id}>
                                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: ward.color }}>{ward.name}</h3>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {wardBeds.map(bed => (
                                            <button
                                                key={bed.id}
                                                disabled={submitting || bed.id === admission.bed_id}
                                                onClick={() => handleMove(bed.id)}
                                                className={`p-3 rounded-lg border transition-all text-center ${bed.id === admission.bed_id
                                                    ? 'bg-primary/20 border-primary text-primary opacity-50 cursor-default'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold block">{bed.name}</span>
                                                {bed.id === admission.bed_id && <span className="text-[8px] uppercase">Atual</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="btn btn-outline text-muted">Cancelar</button>
                </div>
            </div>
        </div>
    )
}
