'use client'

import { useState, useEffect } from 'react'
import { prescreverMedicacao, applyMedicationDose, getMedicationLogs, getHospitalObservations, addHospitalObservation, updateAdmissionSeverity, getAdmissionMedications } from '@/app/actions/hospital'

export default function InternmentRecordModal({ admission, onClose, onSuccess }: { admission: any, onClose: () => void, onSuccess: () => void }) {
    const [activeTab, setActiveTab] = useState<'medications' | 'observations'>('medications')
    const [loading, setLoading] = useState(false)
    const [medicationLogs, setMedicationLogs] = useState<any[]>([])
    const [activeMedications, setActiveMedications] = useState<any[]>([])
    const [observations, setObservations] = useState<any[]>([])
    const [applyNotes, setApplyNotes] = useState<Record<string, string>>({})
    const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
    const [currentSeverity, setCurrentSeverity] = useState(admission.severity)

    const loadRecords = async () => {
        const [logs, obs, activeMeds] = await Promise.all([
            getMedicationLogs(admission.id),
            getHospitalObservations(admission.id),
            getAdmissionMedications(admission.id)
        ])
        setMedicationLogs(logs)
        setObservations(obs)
        setActiveMedications(activeMeds)
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
        if (res.success) {
            e.currentTarget.reset()
            // Pequeno delay para garantir que o insert foi processado antes do fetch
            setTimeout(async () => {
                await loadRecords()
                onSuccess()
                setLoading(false)
                setShowPrescriptionForm(false)
            }, 500)
        } else {
            setLoading(false)
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
            // Pequeno delay para garantir que a inserção no banco foi processada antes do fetch
            setTimeout(() => {
                loadRecords()
                onSuccess()
            }, 400)
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

    const handleUpdateSeverity = async (newSeverity: string) => {
        setLoading(true)
        const res = await updateAdmissionSeverity(admission.id, newSeverity)
        setLoading(false)
        if (res.success) {
            setCurrentSeverity(newSeverity)
            onSuccess()
        }
    }

    return (
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative flex flex-col p-0" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', padding: 0, overflow: 'hidden', border: '1px solid rgba(0, 228, 206, 0.2)', fontFamily: 'var(--font-montserrat)' }}>
                {/* Header */}
                <div className="relative" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="absolute inset-0 bg-navy-dark/40 backdrop-blur-sm" />
                    <div className="flex justify-between items-center relative z-10" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(140, 180, 201, 0.1)' }}>
                        <div className="flex gap-4 items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-coral" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-montserrat)' }}>🩺 Prontuário Clínico</h2>
                                <p className="text-muted text-sm" style={{ margin: '4px 0 0 0', fontFamily: 'var(--font-montserrat)' }}>
                                    Paciente: <span className="text-sky font-bold">{admission.pets.name}</span> ({admission.pets.species === 'cat' ? 'Felino' : 'Canino'}) • Tutor: <span style={{ color: '#fff' }}>{admission.pets.customers?.name}</span>
                                </p>
                            </div>
                            <div style={{ marginLeft: '1rem', borderLeft: '1px solid rgba(140, 180, 201, 0.2)', paddingLeft: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-montserrat)' }}>Status Clínico Atual</label>
                                <select
                                    value={currentSeverity}
                                    onChange={(e) => handleUpdateSeverity(e.target.value)}
                                    className="input"
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        width: 'auto',
                                        color: currentSeverity === 'low' ? 'var(--status-done)' : currentSeverity === 'medium' ? 'var(--status-pending)' : currentSeverity === 'high' ? 'var(--status-in-progress)' : 'var(--status-canceled)',
                                        backgroundColor: 'rgba(27, 59, 90, 0.3)',
                                        fontFamily: 'var(--font-montserrat)'
                                    }}
                                >
                                    <option value="low">🟢 Estável / Baixa Gravidade</option>
                                    <option value="medium">🟡 Moderado / Observação</option>
                                    <option value="high">🟠 Grave / Atenção Constante</option>
                                    <option value="critical">🔴 Crítico / Risco Iminente</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6" style={{ padding: '1rem 1.5rem 0 1.5rem', borderBottom: '1px solid rgba(140, 180, 201, 0.1)', backgroundColor: 'var(--bg-tertiary)' }}>
                    <button
                        className="font-bold text-sm"
                        style={{ paddingBottom: '1rem', position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)', color: activeTab === 'medications' ? 'var(--color-sky)' : 'var(--text-muted)' }}
                        onClick={() => setActiveTab('medications')}
                    >
                        💊 Medicações
                        {activeTab === 'medications' && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: 'var(--color-sky)', borderRadius: '4px 4px 0 0' }}></div>}
                    </button>
                    <button
                        className="font-bold text-sm"
                        style={{ paddingBottom: '1rem', position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)', color: activeTab === 'observations' ? 'var(--color-sky)' : 'var(--text-muted)' }}
                        onClick={() => setActiveTab('observations')}
                    >
                        📋 Evolução Clínica
                        {activeTab === 'observations' && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: 'var(--color-sky)', borderRadius: '4px 4px 0 0' }}></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-col" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'rgba(13, 27, 42, 0.4)' }}>
                    {activeTab === 'medications' && (
                        <div className="flex flex-col gap-6">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold" style={{ color: '#fff', margin: 0 }}>Prescrições Ativas</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{activeMedications.length} Item(s)</span>
                                </div>

                                {activeMedications.length === 0 ? (
                                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '12px', border: '2px dashed rgba(42, 86, 130, 0.5)', backgroundColor: 'rgba(27, 59, 90, 0.2)', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                                        <p style={{ fontWeight: 500 }}>Nenhuma prescrição ativa para este paciente.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        {activeMedications.map(m => (
                                            <div key={m.id} className="card glass p-0 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--color-sky)', padding: 0, overflow: 'hidden' }}>
                                                <div style={{ padding: '1.25rem' }}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <strong className="text-lg text-sky">{m.name}</strong>
                                                        <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>{m.frequency_hours}h / {m.frequency_hours}h</span>
                                                    </div>
                                                    <div className="flex flex-col gap-2 mb-4">
                                                        <p className="text-secondary text-sm" style={{ margin: 0 }}>Dosagem: <span style={{ color: '#fff', fontWeight: 600 }}>{m.dosage}</span></p>
                                                        {m.notes && <p className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', margin: 0, backgroundColor: 'rgba(27, 59, 90, 0.3)', padding: '8px', borderRadius: '4px' }}>"{m.notes}"</p>}
                                                    </div>

                                                    <div style={{ marginTop: '1rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Observação da Dose</label>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            style={{ fontSize: '0.75rem', padding: '8px', fontFamily: 'var(--font-montserrat)' }}
                                                            placeholder="Como o pet reagiu? Alguma nota?"
                                                            value={applyNotes[m.id] || ''}
                                                            onChange={(e) => setApplyNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between" style={{ padding: '1rem 1.25rem', backgroundColor: 'rgba(22, 38, 56, 0.5)', borderTop: '1px solid rgba(0, 228, 206, 0.1)' }}>
                                                    <div className="flex flex-col">
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '-0.05em' }}>Próxima Dose</span>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: new Date(m.next_dose_at) <= new Date() ? 'var(--status-canceled)' : 'var(--status-done)' }}>
                                                            {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        disabled={loading}
                                                        onClick={() => handleApplyDose(m.id)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                                                    >
                                                        💉 Aplicar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                                {!showPrescriptionForm ? (
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Prescrições Médicas</h3>
                                            <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Adicione novos medicamentos ou tratamentos</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPrescriptionForm(true)}
                                            className="btn btn-primary"
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>＋</span> Nova Prescrição
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-coral" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-montserrat)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(240, 140, 152, 0.2)', fontSize: '0.75rem', color: '#fff', fontFamily: 'var(--font-montserrat)' }}>＋</span>
                                                Nova Prescrição Médica
                                            </h3>
                                            <button
                                                onClick={() => setShowPrescriptionForm(false)}
                                                className="text-muted"
                                                style={{ fontSize: '0.75rem', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                        <form onSubmit={handlePrescribe} className="flex flex-col gap-4">
                                            <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                                                <div style={{ flex: 2, minWidth: '200px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Medicamento</label>
                                                    <input type="text" name="name" required className="input" placeholder="Ex: Dipirona gotas" style={{ fontFamily: 'var(--font-montserrat)' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Dose e Via</label>
                                                    <input type="text" name="dosage" required className="input" placeholder="Ex: 5 gotas VO" style={{ fontFamily: 'var(--font-montserrat)' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: '100px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Intervalo (h)</label>
                                                    <input type="number" name="frequencyHours" required min="1" className="input" placeholder="Ex: 8" style={{ fontFamily: 'var(--font-montserrat)' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Recomendações e Observações Livres</label>
                                                <textarea name="notes" className="input" style={{ resize: 'none', padding: '12px', fontFamily: 'var(--font-montserrat)' }} rows={2} placeholder="Descreva aqui orientações ou observações adicionais para este medicamento..."></textarea>
                                            </div>
                                            <div className="flex justify-center mt-2" style={{ justifyContent: 'flex-end' }}>
                                                <button type="submit" disabled={loading} className="btn btn-primary text-sm" style={{ padding: '12px 32px', fontFamily: 'var(--font-montserrat)' }}>
                                                    {loading ? '...' : 'Salvar Prescrição'}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold" style={{ color: '#fff', margin: 0 }}>Histórico de Aplicações</h3>
                                    <button
                                        onClick={loadRecords}
                                        style={{ fontSize: '0.65rem', color: 'var(--color-sky)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', backgroundColor: 'rgba(27, 59, 90, 0.3)', padding: '4px 12px', borderRadius: '16px', border: '1px solid rgba(0, 228, 206, 0.2)', cursor: 'pointer' }}
                                    >
                                        🔄 Atualizar
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {medicationLogs.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: '0.875rem', fontStyle: 'italic', padding: '2.5rem', textAlign: 'center', border: '2px dashed rgba(42, 86, 130, 0.5)', borderRadius: '12px' }}>Nenhum registro de aplicação encontrado.</p>
                                    ) : (
                                        medicationLogs.map(log => (
                                            <div key={log.id} className="flex flex-col gap-2" style={{ padding: '1rem', backgroundColor: 'rgba(30, 52, 75, 0.4)', borderRadius: '12px', border: '1px solid transparent', transition: 'all 0.2s' }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sky font-bold" style={{ fontFamily: 'var(--font-montserrat)', fontSize: '0.75rem' }}>{new Date(log.applied_at).toLocaleString('pt-BR')}</span>
                                                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-montserrat)' }}>{log.hospital_medications?.name}</span>
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-montserrat)' }}>({log.hospital_medications?.dosage})</span>
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-montserrat)' }}>
                                                        por {log.profiles?.full_name || 'Usuário'}
                                                    </div>
                                                </div>
                                                {log.notes && (
                                                    <div className="text-secondary" style={{ marginTop: '4px', padding: '8px', backgroundColor: 'rgba(18, 40, 64, 0.4)', borderRadius: '4px', fontSize: '0.75rem', borderLeft: '2px solid var(--color-coral)', fontStyle: 'italic', fontFamily: 'var(--font-montserrat)' }}>
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
                        <div className="flex flex-col gap-6" style={{ height: '100%' }}>
                            <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                                <label className="text-coral font-bold text-sm" style={{ display: 'block', marginBottom: '1rem', fontFamily: 'var(--font-montserrat)' }}>Evolução Clínica / Notas de Observação</label>
                                <form onSubmit={handleAddObservation} className="flex flex-col gap-4">
                                    <textarea
                                        name="observation"
                                        required
                                        rows={4}
                                        className="input text-sm"
                                        style={{ resize: 'none', backgroundColor: 'rgba(27, 59, 90, 0.4)', fontFamily: 'var(--font-montserrat)' }}
                                        placeholder="Descreva o estado atual do paciente, apetite, comportamento..."
                                    />
                                    <div className="flex" style={{ justifyContent: 'flex-end' }}>
                                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 32px', fontFamily: 'var(--font-montserrat)' }}>
                                            {loading ? 'Salvando...' : 'Registrar Evolução'}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <section style={{ flex: 1 }}>
                                <h3 className="text-lg font-bold mb-6" style={{ color: '#fff', fontFamily: 'var(--font-montserrat)' }}>Linha do Tempo de Evolução</h3>
                                <div className="flex flex-col gap-6" style={{ position: 'relative', paddingLeft: '2rem', marginLeft: '1rem', fontFamily: 'var(--font-montserrat)' }}>
                                    <div style={{ position: 'absolute', left: 0, top: '8px', width: '2px', height: 'calc(100% - 16px)', background: 'linear-gradient(180deg, var(--color-sky) 0%, rgba(42, 86, 130, 0.5) 100%)' }}></div>

                                    {observations.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: '0.875rem', fontStyle: 'italic', marginLeft: '-2rem', textAlign: 'center', padding: '2.5rem' }}>Inicie o acompanhamento clínico registrando a primeira evolução acima.</p>
                                    ) : (
                                        observations.map(obs => (
                                            <div key={obs.id} style={{ position: 'relative' }}>
                                                {/* Timeline Node */}
                                                <div style={{ position: 'absolute', left: '-2.5rem', top: '0.25rem', width: '1rem', height: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-navy)', border: '3px solid var(--color-sky)', zIndex: 10 }}></div>

                                                <div className="glass" style={{ padding: '1.25rem', borderRadius: '16px', transition: 'all 0.3s ease' }}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0, 228, 206, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky)', fontWeight: 700, fontSize: '0.75rem' }}>
                                                                {obs.profiles?.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 700 }}>{obs.profiles?.full_name || 'Usuário'}</span>
                                                        </div>
                                                        <span className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'var(--color-navy-dark)', padding: '4px 12px', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>
                                                            {new Date(obs.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-secondary text-sm" style={{ margin: 0, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{obs.observation}</p>
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
