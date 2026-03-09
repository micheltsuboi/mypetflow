'use client'

import { useState, useEffect } from 'react'
import { prescreverMedicacao, applyMedicationDose, getMedicationLogs, getHospitalObservations, addHospitalObservation } from '@/app/actions/hospital'

export default function InternmentRecordModal({ admission, activeMedications, onClose, onSuccess }: { admission: any, activeMedications: any[], onClose: () => void, onSuccess: () => void }) {
    const [activeTab, setActiveTab] = useState<'medications' | 'observations'>('medications')
    const [loading, setLoading] = useState(false)
    const [medicationLogs, setMedicationLogs] = useState<any[]>([])
    const [observations, setObservations] = useState<any[]>([])

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
        const res = await applyMedicationDose(medId, admission.id)
        setLoading(false)
        if (res.success) {
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
            <div className="card glass relative flex flex-col p-0" style={{ width: '100%', maxWidth: '800px', height: '90vh', overflow: 'hidden' }}>
                <div className="flex justify-between items-center px-6 py-4 border-b bg-secondary" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <div>
                        <h2 className="text-2xl font-bold text-coral m-0 flex items-center gap-2">🩺 Prontuário Clínico</h2>
                        <p className="text-muted text-sm m-0 mt-1">Paciente: <span className="text-white font-bold">{admission.pets.name}</span> ({admission.pets.species === 'cat' ? 'Felino' : 'Canino'} • {admission.pets.breed})</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <div className="flex px-6 pt-4 gap-6 border-b bg-tertiary text-sm" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <button
                        className={`pb-3 font-bold transition-colors ${activeTab === 'medications' ? 'text-coral border-b-2 border-coral' : 'text-muted hover:text-secondary'}`}
                        style={{ background: 'transparent', outline: 'none' }}
                        onClick={() => setActiveTab('medications')}
                    >
                        💊 Relatório de Medicações
                    </button>
                    <button
                        className={`pb-3 font-bold transition-colors ${activeTab === 'observations' ? 'text-coral border-b-2 border-coral' : 'text-muted hover:text-secondary'}`}
                        style={{ background: 'transparent', outline: 'none' }}
                        onClick={() => setActiveTab('observations')}
                    >
                        📋 Evolução Diária (Observações)
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'medications' && (
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="text-lg font-bold text-secondary mb-4">Medicações Ativas</h3>
                                {activeMedications.length === 0 ? (
                                    <div className="p-4 rounded border-dashed border text-muted bg-tertiary">
                                        Nenhuma prescrição ativa. Use o formulário abaixo para prescrever.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activeMedications.map(m => (
                                            <div key={m.id} className="p-4 rounded bg-tertiary relative border flex flex-col justify-between" style={{ borderColor: 'rgba(140, 180, 201, 0.2)' }}>
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <strong className="text-lg text-primary">{m.name}</strong>
                                                        <span className="badge badge-confirmed">A cada {m.frequency_hours}h</span>
                                                    </div>
                                                    <p className="text-muted text-sm mb-3">Dose Via: <span className="text-white">{m.dosage}</span></p>
                                                    {m.notes && <p className="text-xs text-muted mb-3 italic">Obs: {m.notes}</p>}
                                                </div>
                                                <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                                    <span className="text-xs font-bold" style={{ color: new Date(m.next_dose_at) <= new Date() ? 'var(--status-canceled)' : 'var(--status-pending)' }}>
                                                        ⏰ Próx: {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                                    </span>
                                                    <button disabled={loading} onClick={() => handleApplyDose(m.id)} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                                                        💉 Aplicar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handlePrescribe} className="bg-secondary p-4 rounded border" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                <h3 className="text-md font-bold text-coral mb-3 mt-0">Nova Prescrição</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                    <div className="col-span-2">
                                        <input type="text" name="name" required className="input text-sm" placeholder="Nome (Ex: Dipirona Gotas)" />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="text" name="dosage" required className="input text-sm" placeholder="Dose/Via (Ex: 5ml VO)" />
                                    </div>
                                    <div className="col-span-1">
                                        <input type="number" name="frequencyHours" required min="1" max="72" className="input text-sm" placeholder="A cada (Horas)" />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="text" name="notes" className="input text-sm" placeholder="Observações (Opcional)" />
                                    </div>
                                    <div className="col-span-1 flex items-end">
                                        <button type="submit" disabled={loading} className="btn btn-navy w-full text-sm p-2">
                                            + Incluir
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div>
                                <h3 className="text-lg font-bold text-secondary mb-4">Histórico de Aplicações</h3>
                                {medicationLogs.length === 0 ? (
                                    <div className="p-4 rounded border-dashed border text-muted bg-tertiary">
                                        Nenhuma dose foi aplicada até o momento neste internamento.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {medicationLogs.map(log => (
                                            <div key={log.id} className="flex gap-4 p-3 bg-tertiary rounded text-sm items-center border" style={{ borderColor: 'rgba(140, 180, 201, 0.05)' }}>
                                                <div className="text-xs text-muted w-32 shrink-0">
                                                    {new Date(log.applied_at).toLocaleString('pt-BR')}
                                                </div>
                                                <div className="flex-1">
                                                    <strong className="text-white">{log.hospital_medications?.name}</strong> • <span className="text-secondary">{log.hospital_medications?.dosage}</span>
                                                </div>
                                                <div className="text-xs text-muted shrink-0 text-right">
                                                    por {log.profiles?.full_name || 'Usuário'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'observations' && (
                        <div className="flex flex-col gap-6 h-full">
                            <form onSubmit={handleAddObservation} className="bg-secondary p-4 rounded border flex flex-col gap-3" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                <label className="text-coral font-bold text-sm">Registrar Evolução ou Observação</label>
                                <textarea name="observation" required rows={3} className="input text-sm" placeholder="O paciente apresentou melhora... Se alimentou bem..." />
                                <div className="flex justify-end">
                                    <button type="submit" disabled={loading} className="btn btn-primary text-sm p-2 px-6">
                                        Salvar Observação
                                    </button>
                                </div>
                            </form>

                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-secondary mb-4">Acompanhamento e Evolução</h3>
                                {observations.length === 0 ? (
                                    <div className="p-4 text-center rounded border-dashed border text-muted bg-tertiary">
                                        Nenhum registro de evolução foi adicionado ao prontuário.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 relative before:absolute before:border-l-2 before:border-secondary before:h-full before:left-[11px] before:top-4 pl-8">
                                        {observations.map(obs => (
                                            <div key={obs.id} className="relative bg-tertiary p-4 rounded border" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                                                {/* Timeline dot */}
                                                <div className="absolute w-6 h-6 bg-secondary rounded-full border-4 flex items-center justify-center text-xs" style={{ left: '-39px', top: '16px', borderColor: 'var(--bg-primary)' }}></div>

                                                <div className="flex justify-between items-center mb-2">
                                                    <strong className="text-white text-sm">{obs.profiles?.full_name || 'Equipe'}</strong>
                                                    <span className="text-xs text-muted bg-primary-light bg-opacity-10 py-1 px-2 rounded">
                                                        {new Date(obs.created_at).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-secondary m-0 whitespace-pre-wrap leading-relaxed">{obs.observation}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
