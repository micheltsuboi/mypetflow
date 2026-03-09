'use client'

import { useState, useEffect } from 'react'
import { getHospitalWards, getHospitalBeds, createWard, createBedsBatch, deleteWard, deleteBed } from '@/app/actions/hospital'
import Link from 'next/link'
import styles from '../page.module.css' // Import from parent

export default function ConfigHospital() {
    const [wards, setWards] = useState<any[]>([])
    const [beds, setBeds] = useState<any[]>([])
    const [newWardName, setNewWardName] = useState('')
    const [newWardColor, setNewWardColor] = useState('#F08C98') // Coral
    const [bedCounts, setBedCounts] = useState<Record<string, number>>({})
    const [bedPrefixes, setBedPrefixes] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    const loadData = async () => {
        setLoading(true)
        const [w, b] = await Promise.all([getHospitalWards(), getHospitalBeds()])
        setWards(w)
        setBeds(b)
        setLoading(false)
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

    const handleRemoveWard = async (wardId: string) => {
        if (!confirm('Deseja realmente remover este setor? Os leitos não poderão ter internamentos ativos.')) return;
        const res = await deleteWard(wardId)
        if (res.success) loadData()
        else alert(res.message)
    }

    const handleRemoveBed = async (bedId: string) => {
        if (!confirm('Deseja remover este leito?')) return;
        const res = await deleteBed(bedId)
        if (res.success) loadData()
        else alert(res.message)
    }

    return (
        <div className="container p-6">
            <div className="flex flex-col mb-6">
                <Link href="/owner/hospital" className="text-secondary text-sm mb-2" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ← Voltar para Mapa de Leitos
                </Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-coral">Configuração de Estrutura</h1>
                </div>
                <p className="text-muted text-sm mt-2">Crie os setores e leitos para internamento do hospital ou clínica.</p>
            </div>

            <div className="card mb-6 animate-fadeIn">
                <h2 className="text-lg font-bold mb-4">Adicionar Novo Setor (Ala)</h2>
                <form onSubmit={handleCreateWard} className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <label className="label">Nome do Setor</label>
                        <input
                            type="text"
                            required
                            value={newWardName}
                            onChange={e => setNewWardName(e.target.value)}
                            className="input"
                            placeholder="Ex: UTI, Internamento Canino"
                        />
                    </div>
                    <div>
                        <label className="label">Cor de Identificação</label>
                        <input
                            type="color"
                            value={newWardColor}
                            onChange={e => setNewWardColor(e.target.value)}
                            style={{ width: '56px', height: '44px', padding: '0', cursor: 'pointer', border: '1px solid rgba(140, 180, 201, 0.2)', borderRadius: 'var(--radius-lg)', background: 'transparent' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        + Criar Setor
                    </button>
                </form>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4 text-secondary">Setores e Leitos</h2>
                {loading && <p className="text-muted">Carregando...</p>}

                {wards.length === 0 && !loading && (
                    <div className="card text-center p-6 text-muted">
                        Nenhum setor cadastrado ainda. Crie o primeiro acima.
                    </div>
                )}

                {wards.map(w => {
                    const wardBeds = beds.filter(b => b.ward_id === w.id)
                    return (
                        <div key={w.id} className="card mb-6 animate-fadeIn" style={{ borderLeft: `6px solid ${w.color}`, padding: 0, overflow: 'hidden' }}>
                            <div className="flex justify-between items-center p-4 glass" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <span className="font-bold text-lg" style={{ color: w.color }}>{w.name} ({wardBeds.length} leitos)</span>
                                <button onClick={() => handleRemoveWard(w.id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--status-canceled)', color: 'var(--status-canceled)' }}>
                                    Remover Setor
                                </button>
                            </div>

                            <div className="p-4 bg-tertiary">
                                <div className="flex gap-4 items-end mb-6 pb-6" style={{ borderBottom: '1px solid rgba(140, 180, 201, 0.1)', flexWrap: 'wrap' }}>
                                    <div>
                                        <label className="label text-sm">Quantos leitos adicionar?</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={bedCounts[w.id] || 1}
                                            onChange={e => setBedCounts({ ...bedCounts, [w.id]: parseInt(e.target.value) })}
                                            className="input"
                                            style={{ width: '120px' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-sm">Prefixo (Ex: UTI-)</label>
                                        <input
                                            type="text"
                                            value={bedPrefixes[w.id] ?? 'L-'}
                                            onChange={e => setBedPrefixes({ ...bedPrefixes, [w.id]: e.target.value })}
                                            className="input"
                                            style={{ width: '150px' }}
                                        />
                                    </div>
                                    <button onClick={() => handleCreateBeds(w.id)} className="btn btn-secondary">
                                        + Gerar Leitos
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {wardBeds.length === 0 && (
                                        <div className="text-muted text-sm" style={{ gridColumn: '1 / -1' }}>Nenhum leito neste setor. Gere leitos acima.</div>
                                    )}
                                    {wardBeds.map(b => (
                                        <div key={b.id} className="glass flex flex-col items-center justify-center p-3 relative group" style={{ borderRadius: 'var(--radius-md)', border: b.status === 'occupied' ? '1px solid var(--status-pending)' : '1px solid rgba(140, 180, 201, 0.2)' }}>
                                            <button
                                                onClick={() => handleRemoveBed(b.id)}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                                                style={{ background: 'transparent', border: 'none', color: 'var(--status-canceled)', cursor: 'pointer', transition: 'opacity 0.2s', padding: '4px' }}
                                                title="Excluir leito"
                                            >
                                                ✕
                                            </button>
                                            <strong className="text-secondary">{b.name}</strong>
                                            <div className="text-xs mt-1" style={{ color: b.status === 'available' ? 'var(--status-done)' : 'var(--status-pending)' }}>
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
