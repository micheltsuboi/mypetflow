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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Medicações - {admission.pets.name}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Receituário Ativo</h3>
                    {medications.length === 0 ? (
                        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Nenhuma medicação ativa.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {medications.map(m => (
                                <li key={m.id} style={{ padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.875rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <strong style={{ fontSize: '1rem' }}>{m.name}</strong>
                                        <span style={{ color: '#3B82F6', fontWeight: 500 }}>A cada {m.frequency_hours}h</span>
                                    </div>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#4B5563' }}>Dosagem: {m.dosage}</p>
                                    <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                        Próxima dose: {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ background: '#F3F4F6', padding: '1.5rem', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', marginTop: 0 }}>Nova Prescrição</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Medicamento</label>
                            <input type="text" name="name" required style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #D1D5DB' }} placeholder="Ex: Dipirona 500mg" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Via / Dosagem</label>
                            <input type="text" name="dosage" required style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #D1D5DB' }} placeholder="Ex: 5ml VO" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Frequência (horas)</label>
                            <input type="number" name="frequencyHours" required min="1" max="72" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #D1D5DB' }} placeholder="Ex: 8" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Observações</label>
                            <input type="text" name="notes" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #D1D5DB' }} placeholder="Ex: Aplicar com alimento" />
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Fechar</button>
                        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                            {loading ? 'Salvando...' : 'Prescrever'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
