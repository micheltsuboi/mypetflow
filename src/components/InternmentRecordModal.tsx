'use client'

import { useState, useEffect } from 'react'
import { prescreverMedicacao, applyMedicationDose, getMedicationLogs, getHospitalObservations, addHospitalObservation } from '@/app/actions/hospital'

export default function InternmentRecordModal({ admission, activeMedications, onClose, onSuccess }: { admission: any, activeMedications: any[], onClose: () => void, onSuccess: () => void }) {
    const [activeTab, setActiveTab] = useState<'medications' | 'observations'>('medications')
    const [loading, setLoading] = useState(false)
    const [medicationLogs, setMedicationLogs] = useState<any[]>([])
    const [observations, setObservations] = useState<any[]>([])
    const [applyNotes, setApplyNotes] = useState<Record<string, string>>({})
    const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)

    const loadRecords = async () => {
        const [logs, obs] = await Promise.all([
            getMedicationLogs(admission.id),
            getHospitalObservations(admission.id)
        ])
        setMedicationLogs(logs)
        setObservations(obs)
    }

    useEffect(() => {
        loadRecords()
    }, [])

    const handlePrescribe = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('admissionId', admission.id)
        formData.append('petId', admission.pet_id)

        const res = await prescreverMedicacao(formData)
        setLoading(false)
        if (res.success) {
            e.currentTarget.reset()
            onSuccess()
        } else {
            alert(res.message)
        }
    }

    const handleApplyDose = async (medId: string) => {
        setLoading(true)
        const note = applyNotes[medId] || ''
        const res = await applyMedicationDose(medId, admission.id, note)
        setLoading(false)
        if (res.success) {
            setApplyNotes(prev => ({ ...prev, [medId]: '' }))
            loadRecords()
            onSuccess()
        } else {
            alert(res.message)
        }
    }

    const handleAddObservation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('admissionId', admission.id)

        const res = await addHospitalObservation(formData)
        setLoading(false)
        if (res.success) {
            e.currentTarget.reset()
            loadRecords()
        } else {
            alert(res.message)
        }
    }

    return (
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative flex flex-col p-0 font-sans" style={{ width: '100%', maxWidth: '900px', height: '94vh', overflow: 'hidden', border: '1px solid rgba(0, 228, 206, 0.2)', fontFamily: 'var(--font-montserrat)' }}>
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b bg-secondary" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <div>
                        <h2 className="text-2xl font-bold text-coral m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-montserrat)' }}>🩺 Prontuário Clínico</h2>
                        <p className="text-muted text-sm m-0 mt-1" style={{ fontFamily: 'var(--font-montserrat)' }}>
                            Paciente: <span className="text-sky font-bold">{admission.pets.name}</span> ({admission.pets.species === 'cat' ? 'Felino' : 'Canino'}) • Tutor: <span className="text-white">{admission.pets.customers?.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors p-2" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-4 gap-8 border-b bg-tertiary" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <button
                        className={`pb-4 font-bold text-sm transition-all relative ${activeTab === 'medications' ? 'text-sky' : 'text-muted hover:text-secondary'}`}
                        style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                        onClick={() => setActiveTab('medications')}
                    >
                        💊 Medicações
                        {activeTab === 'medications' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-sky rounded-t-full shadow-glow-sky"></div>}
                    </button>
                    <button
                        className={`pb-4 font-bold text-sm transition-all relative ${activeTab === 'observations' ? 'text-sky' : 'text-muted hover:text-secondary'}`}
                        style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                        onClick={() => setActiveTab('observations')}
                    >
                        📋 Evolução Clínica
                        {activeTab === 'observations' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-sky rounded-t-full shadow-glow-sky"></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6" style={{ background: 'rgba(13, 27, 42, 0.4)' }}>
                    {activeTab === 'medications' && (
                        <div className="flex flex-col gap-8">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white m-0" style={{ fontFamily: 'var(--font-montserrat)' }}>Prescrições Ativas</h3>
                                    <span className="text-xs text-muted font-semibold uppercase tracking-widest">{activeMedications.length} Item(s)</span>
                                </div>

                                {activeMedications.length === 0 ? (
                                    <div className="p-10 text-center rounded-xl border-2 border-dashed border-navy-light bg-navy bg-opacity-20 text-muted">
                                        <div className="text-3xl mb-2">📋</div>
                                        <p className="font-medium">Nenhuma prescrição ativa para este paciente.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {activeMedications.map(m => (
                                            <div key={m.id} className="card glass p-0 flex flex-col justify-between overflow-hidden" style={{ borderLeft: '4px solid var(--color-sky)' }}>
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <strong className="text-lg text-sky" style={{ fontFamily: 'var(--font-montserrat)' }}>{m.name}</strong>
                                                        <span className="badge badge-confirmed" style={{ fontSize: '10px' }}>{m.frequency_hours}h / {m.frequency_hours}h</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 mb-3">
                                                        <p className="text-secondary text-sm m-0">Dosagem: <span className="text-white font-semibold">{m.dosage}</span></p>
                                                        {m.notes && <p className="text-xs text-muted italic m-0 bg-navy bg-opacity-30 p-2 rounded mt-1">"{m.notes}"</p>}
                                                    </div>

                                                    <div className="mt-4">
                                                        <label className="text-[10px] uppercase font-bold text-muted block mb-1">Observação da Dose</label>
                                                        <input
                                                            type="text"
                                                            className="input py-2 text-xs"
                                                            placeholder="Como o pet reagiu? Alguma nota?"
                                                            value={applyNotes[m.id] || ''}
                                                            onChange={(e) => setApplyNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-secondary bg-opacity-30 border-t flex items-center justify-between" style={{ borderColor: 'rgba(0, 228, 206, 0.1)' }}>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Próxima Dose</span>
                                                        <span className="text-xs font-bold" style={{ color: new Date(m.next_dose_at) <= new Date() ? 'var(--status-canceled)' : 'var(--status-done)' }}>
                                                            {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        disabled={loading}
                                                        onClick={() => handleApplyDose(m.id)}
                                                        className="btn btn-secondary shadow-glow-sky"
                                                        style={{ padding: '8px 18px', fontSize: '12px' }}
                                                    >
                                                        💉 Aplicar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="bg-secondary p-8 rounded-2xl border transition-all" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                {!showPrescriptionForm ? (
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h3 className="text-md font-bold text-white m-0" style={{ fontFamily: 'var(--font-montserrat)' }}>Prescrições Médicas</h3>
                                            <p className="text-xs text-muted mb-0">Adicione novos medicamentos ou tratamentos</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPrescriptionForm(true)}
                                            className="btn btn-primary px-6 flex items-center gap-2"
                                            style={{ fontFamily: 'var(--font-montserrat)' }}
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>＋</span> Nova Prescrição
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-md font-bold text-coral m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-montserrat)' }}>
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-coral bg-opacity-20 text-xs text-white">＋</span>
                                                Nova Prescrição Médica
                                            </h3>
                                            <button
                                                onClick={() => setShowPrescriptionForm(false)}
                                                className="text-xs text-muted hover:text-white underline"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                        <form onSubmit={handlePrescribe} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-5">
                                                <label className="label text-[11px] uppercase tracking-wider font-bold">Medicamento</label>
                                                <input type="text" name="name" required className="input text-sm" placeholder="Ex: Dipirona gotas" />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="label text-[11px] uppercase tracking-wider font-bold">Dose e Via</label>
                                                <input type="text" name="dosage" required className="input text-sm" placeholder="Ex: 5 gotas VO" />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="label text-[11px] uppercase tracking-wider font-bold">Intervalo (h)</label>
                                                <input type="number" name="frequencyHours" required min="1" className="input text-sm" placeholder="Ex: 8" />
                                            </div>
                                            <div className="md:col-span-12">
                                                <label className="label text-[11px] uppercase tracking-wider font-bold">Recomendações e Observações Livres</label>
                                                <textarea name="notes" className="input text-sm py-3" style={{ resize: 'none' }} rows={2} placeholder="Descreva aqui orientações ou observações adicionais para este medicamento..."></textarea>
                                            </div>
                                            <div className="md:col-span-12 flex justify-end mt-2">
                                                <button type="submit" disabled={loading} className="btn btn-primary shadow-glow-coral py-3 px-10">
                                                    {loading ? '...' : 'Salvar Prescrição'}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white m-0" style={{ fontFamily: 'var(--font-montserrat)' }}>Histórico de Aplicações</h3>
                                    <button
                                        onClick={loadRecords}
                                        className="text-[10px] text-sky hover:text-white uppercase font-bold tracking-widest bg-navy bg-opacity-30 px-3 py-1 rounded-full border border-sky border-opacity-20"
                                    >
                                        🔄 Atualizar
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {medicationLogs.length === 0 ? (
                                        <p className="text-sm text-muted italic p-10 text-center border-2 border-dashed border-navy-light rounded-xl">Nenhum registro de aplicação encontrado.</p>
                                    ) : (
                                        medicationLogs.map(log => (
                                            <div key={log.id} className="flex flex-col gap-2 p-4 bg-tertiary bg-opacity-40 rounded-xl text-sm border border-transparent hover:border-sky transition-all cursor-default group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sky font-bold font-mono text-xs">{new Date(log.applied_at).toLocaleString('pt-BR')}</span>
                                                        <span className="text-white font-bold">{log.hospital_medications?.name}</span>
                                                        <span className="text-muted text-xs">({log.hospital_medications?.dosage})</span>
                                                    </div>
                                                    <div className="text-[10px] text-muted uppercase font-bold">
                                                        por {log.profiles?.full_name}
                                                    </div>
                                                </div>
                                                {log.notes && (
                                                    <div className="mt-1 p-2 bg-navy bg-opacity-40 rounded text-xs text-secondary border-l-2 border-coral italic">
                                                        "{log.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'observations' && (
                        <div className="flex flex-col gap-8 h-full">
                            <section className="bg-secondary p-6 rounded-2xl border" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                <label className="text-coral font-bold text-sm mb-4 block" style={{ fontFamily: 'var(--font-montserrat)' }}>Evolução Clínica / Notas de Observação</label>
                                <form onSubmit={handleAddObservation} className="flex flex-col gap-4">
                                    <textarea
                                        name="observation"
                                        required
                                        rows={4}
                                        className="input text-sm bg-navy bg-opacity-40 focus:bg-opacity-80"
                                        style={{ resize: 'none' }}
                                        placeholder="Descreva o estado atual do paciente, apetite, comportamento..."
                                    />
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={loading} className="btn btn-primary px-8">
                                            {loading ? 'Salvando...' : 'Registrar Evolução'}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <section className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-6" style={{ fontFamily: 'var(--font-montserrat)' }}>Linha do Tempo de Evolução</h3>
                                <div className="flex flex-col gap-6 relative ml-4 pl-8 before:absolute before:left-0 before:top-2 before:w-[2px] before:h-[calc(100%-16px)] before:bg-gradient-to-b before:from-sky before:to-navy-light">
                                    {observations.length === 0 ? (
                                        <p className="text-sm text-muted italic ml-[-32px] text-center p-10">Inicie o acompanhamento clínico registrando a primeira evolução acima.</p>
                                    ) : (
                                        observations.map(obs => (
                                            <div key={obs.id} className="relative group">
                                                {/* Timeline Node */}
                                                <div className="absolute left-[-41px] top-1 w-6 h-6 rounded-full bg-navy border-4 border-sky group-hover:scale-125 transition-transform z-10 shadow-glow-sky"></div>

                                                <div className="glass p-5 rounded-2xl border hover:border-sky transition-all duration-300">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-sky bg-opacity-10 flex items-center justify-center text-sky font-bold text-xs">
                                                                {obs.profiles?.full_name?.charAt(0)}
                                                            </div>
                                                            <span className="text-sm text-white font-bold">{obs.profiles?.full_name}</span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-muted bg-navy-dark px-3 py-1 rounded-full uppercase tracking-tighter">
                                                            {new Date(obs.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-secondary m-0 leading-relaxed font-medium whitespace-pre-wrap">{obs.observation}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
