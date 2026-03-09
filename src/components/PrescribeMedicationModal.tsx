'use client'

import { useState } from 'react'
import { prescreverMedicacao } from '@/app/actions/hospital'

export default function PrescribeMedicationModal({ admission, medications, onClose, onSuccess }: { admission: any, medications: any[], onClose: () => void, onSuccess: () => void }) {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('admissionId', admission.id)
        formData.append('petId', admission.pet_id)

        const res = await prescreverMedicacao(formData)
        setLoading(false)
        if (res.success) {
            alert('Prescrição adicionada!')
            onSuccess()
        } else {
            alert(res.message)
        }
    }

    return (
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative flex flex-col" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden' }}>
                <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <h2 className="text-2xl font-bold text-sky m-0 flex items-center gap-2">💊 Receituário de {admission.pets.name}</h2>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '40vh', marginBottom: '1.5rem' }}>
                    <h3 className="text-lg font-bold text-secondary mb-4">Medicações Ativas</h3>
                    {medications.length === 0 ? (
                        <div className="p-4 rounded border-dashed border text-muted bg-tertiary">
                            Este paciente não possui nenhuma prescrição ativa no leito atual.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {medications.map(m => (
                                <div key={m.id} className="p-4 rounded glass relative border" style={{ borderColor: 'rgba(140, 180, 201, 0.2)' }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <strong className="text-lg text-primary">{m.name}</strong>
                                        <span className="badge badge-confirmed">A cada {m.frequency_hours}h</span>
                                    </div>
                                    <p className="text-muted text-sm mb-3">Dose: <span className="text-white">{m.dosage}</span></p>
                                    <div className="inline-block" style={{ background: 'rgba(232, 130, 106, 0.15)', color: 'var(--status-pending)', border: '1px solid var(--status-pending)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        ⏰ Próxima aplicação prevista: {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="bg-tertiary p-6 rounded border" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                    <h3 className="text-lg font-bold text-coral mb-4 mt-0">Incluir Nova Prescrição</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="label">Qual Medicamento?</label>
                            <input type="text" name="name" required className="input" placeholder="Ex: Dipirona Gotas" />
                        </div>
                        <div>
                            <label className="label">Dosagem e Via</label>
                            <input type="text" name="dosage" required className="input" placeholder="Ex: 5ml VO" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="label">A cada (Horas)</label>
                            <input type="number" name="frequencyHours" required min="1" max="72" className="input" placeholder="Ex: 8" />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Observações sobre a Medicação</label>
                            <input type="text" name="notes" className="input" placeholder="Ex: Aplicar via intravenosa lenta" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                        <button type="button" onClick={onClose} className="btn btn-outline text-muted">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Registrando...' : 'Salvar Prescrição'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
