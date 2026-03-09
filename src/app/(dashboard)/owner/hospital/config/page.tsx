'use client'

import { useState, useEffect } from 'react'
import { getHospitalWards, getHospitalBeds, createWard, createBedsBatch } from '@/app/actions/hospital'
import styles from '../page.module.css'
import Link from 'next/link'

export default function ConfigHospital() {
    const [wards, setWards] = useState<any[]>([])
    const [beds, setBeds] = useState<any[]>([])
    const [newWardName, setNewWardName] = useState('')
    const [newWardColor, setNewWardColor] = useState('#3B82F6')
    const [bedCounts, setBedCounts] = useState<Record<string, number>>({})
    const [bedPrefixes, setBedPrefixes] = useState<Record<string, string>>({})

    const loadData = async () => {
        const [w, b] = await Promise.all([getHospitalWards(), getHospitalBeds()])
        setWards(w)
        setBeds(b)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleCreateWard = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWardName.trim()) return

        const res = await createWard(newWardName, newWardColor)
        if (res.success) {
            setNewWardName('')
            loadData()
        } else {
            alert(res.message)
        }
    }

    const handleCreateBeds = async (wardId: string) => {
        const count = bedCounts[wardId] || 1
        const prefix = bedPrefixes[wardId] || 'L-'

        const res = await createBedsBatch(wardId, count, prefix)
        if (res.success) {
            setBedCounts({ ...bedCounts, [wardId]: 1 })
            loadData()
        } else {
            alert(res.message)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner/hospital" style={{ color: '#6B7280', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>← Voltar para Mapa</Link>
                    <h1 className={styles.title}>Configuração do Hospital</h1>
                </div>
            </div>

            <div className={styles.wardSection} style={{ padding: '1.5rem', background: 'white' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Adicionar Novo Setor (Ala)</h2>
                <form onSubmit={handleCreateWard} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>Nome do Setor</label>
                        <input
                            type="text"
                            required
                            value={newWardName}
                            onChange={e => setNewWardName(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                            placeholder="Ex: UTI, Internamento Canino"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>Cor</label>
                        <input
                            type="color"
                            value={newWardColor}
                            onChange={e => setNewWardColor(e.target.value)}
                            style={{ width: '48px', height: '38px', padding: '0', cursor: 'pointer', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                        />
                    </div>
                    <button type="submit" className={styles.admitButton} style={{ marginTop: 0, width: 'auto' }}>
                        + Criar Setor
                    </button>
                </form>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Setores e Leitos Existentes</h2>
                {wards.map(w => {
                    const wardBeds = beds.filter(b => b.ward_id === w.id)
                    return (
                        <div key={w.id} className={styles.wardSection} style={{ marginBottom: '1.5rem' }}>
                            <div className={styles.wardHeader} style={{ backgroundColor: w.color, cursor: 'default' }}>
                                <span className={styles.wardTitle}>{w.name} ({wardBeds.length} leitos)</span>
                            </div>
                            <div style={{ padding: '1.5rem', background: 'white' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#6B7280' }}>Qtd. Leitos para adicionar</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={bedCounts[w.id] || 1}
                                            onChange={e => setBedCounts({ ...bedCounts, [w.id]: parseInt(e.target.value) })}
                                            style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '4px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: '#6B7280' }}>Prefixo do Nome (Ex: UTI-)</label>
                                        <input
                                            type="text"
                                            value={bedPrefixes[w.id] || 'L'}
                                            onChange={e => setBedPrefixes({ ...bedPrefixes, [w.id]: e.target.value })}
                                            style={{ width: '150px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '4px' }}
                                        />
                                    </div>
                                    <button onClick={() => handleCreateBeds(w.id)} className={styles.actionBtn} style={{ background: '#F3F4F6' }}>
                                        Gerar Leitos em Lote
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                    {wardBeds.map(b => (
                                        <div key={b.id} style={{ padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px', textAlign: 'center', backgroundColor: b.status === 'occupied' ? '#FEF3C7' : '#F9FAFB' }}>
                                            <strong>{b.name}</strong>
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                {b.status === 'available' ? 'Livre' : 'Ocupado'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
