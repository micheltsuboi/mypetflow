'use client'

import { useState, useEffect } from 'react'
import { getVeterinarians } from '@/app/actions/veterinary'
import { admitPet, getHospitalServices } from '@/app/actions/hospital'
import { createClient } from '@/lib/supabase/client'

export default function AdmitPetModal({ bedId, onClose, onSuccess }: { bedId: string, onClose: () => void, onSuccess: () => void }) {
    const [pets, setPets] = useState<any[]>([])
    const [vets, setVets] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
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
                .select('id, name, species, breed, customers!inner(name, org_id)')
                .eq('customers.org_id', profile!.org_id)
                .order('name')
            setPets(pData || [])

            const vData = await getVeterinarians()
            setVets(vData || [])

            const sData = await getHospitalServices()
            setServices(sData || [])
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
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-primary">Internar Paciente</h2>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="label" style={{ fontFamily: 'var(--font-montserrat)' }}>Indicar Paciente</label>
                        <select name="petId" required className="input glass" style={{ fontFamily: 'var(--font-montserrat)' }}>
                            <option value="">Selecione um pet...</option>
                            {pets.map(p => (
                                <option key={p.id} value={p.id} className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>{p.name} ({p.species}) - Tutor: {p.customers?.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label" style={{ fontFamily: 'var(--font-montserrat)' }}>Serviço / Faturamento Base</label>
                        <select name="serviceId" required className="input glass" style={{ fontFamily: 'var(--font-montserrat)' }}>
                            <option value="">Selecione a Tabela de Preço...</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id} className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>{s.name} - R$ {s.base_price?.toFixed(2)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label" style={{ fontFamily: 'var(--font-montserrat)' }}>Motivo do Internamento / Sintomas</label>
                        <textarea name="reason" required rows={2} className="input glass" style={{ resize: 'none', fontFamily: 'var(--font-montserrat)' }} placeholder="Descreva o que houve..." />
                    </div>

                    <div>
                        <label className="label" style={{ fontFamily: 'var(--font-montserrat)' }}>Gravidade Clínica Atual</label>
                        <select name="severity" required className="input glass" style={{ fontFamily: 'var(--font-montserrat)' }}>
                            <option value="low" className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>🟢 Baixo / Apenas Observação</option>
                            <option value="medium" className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>🟡 Médio / Cuidados Regulares</option>
                            <option value="high" className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>🟠 Alto / Atenção Constante</option>
                            <option value="critical" className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>🔴 Crítico / Risco Iminente</option>
                        </select>
                    </div>

                    <div>
                        <label className="label" style={{ fontFamily: 'var(--font-montserrat)' }}>Veterinário Responsável</label>
                        <select name="veterinarianId" className="input glass" style={{ fontFamily: 'var(--font-montserrat)' }}>
                            <option value="" className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>(Opcional / Plantonista Atual)</option>
                            {vets.map(v => (
                                <option key={v.id} value={v.id} className="text-navy" style={{ fontFamily: 'var(--font-montserrat)' }}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(140, 180, 201, 0.1)' }}>
                        <button type="button" onClick={onClose} className="btn btn-outline text-muted">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Processando...' : 'Confirmar Internamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
