'use client'

import { useState, useEffect } from 'react'
import { getVeterinarians } from '@/app/actions/veterinary'
import { admitPet } from '@/app/actions/hospital'
import { createClient } from '@/lib/supabase/client'

export default function AdmitPetModal({ bedId, onClose, onSuccess }: { bedId: string, onClose: () => void, onSuccess: () => void }) {
    const [pets, setPets] = useState<any[]>([])
    const [vets, setVets] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

            // fetch active pets
            const { data: pData } = await supabase
                .from('pets')
                .select('id, name, species, breed, customers(name)')
                .eq('org_id', profile!.org_id)
                .order('name')
            setPets(pData || [])

            const vData = await getVeterinarians()
            setVets(vData || [])
        }
        loadData()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('bedId', bedId)

        const res = await admitPet(formData)
        setLoading(false)
        if (res.success) {
            alert('Pet internado!')
            onSuccess()
        } else {
            alert(res.message)
        }
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Internar Paciente</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Indicar Paciente</label>
                        <select name="petId" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                            <option value="">Selecione um pet...</option>
                            {pets.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.species}) - Tutor: {p.customers?.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Motivo do Internamento</label>
                        <textarea name="reason" required rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB' }} placeholder="Descreva os sintomas ou procedimento..." />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Gravidade do Quadro</label>
                        <select name="severity" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                            <option value="low">🟡 Baixo / Observação</option>
                            <option value="medium">🟠 Médio / Cuidados Regulares</option>
                            <option value="high">🔴 Alto / Atenção Frequente</option>
                            <option value="critical">🚨 Crítico / UTI</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Veterinário Responsável</label>
                        <select name="veterinarianId" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                            <option value="">(Opcional)</option>
                            {vets.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                            {loading ? 'Salvando...' : 'Internar Pet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
