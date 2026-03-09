'use client'

import { useState, useEffect } from 'react'
import { getAllAdmissionsHistory, getAllAdmissionMedications } from '@/app/actions/hospital'
import InternmentRecordModal from '@/components/InternmentRecordModal'

interface HospitalHistoryModalProps {
    onClose: () => void
}

export default function HospitalHistoryModal({ onClose }: HospitalHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Prontuário view states
    const [showRecordModal, setShowRecordModal] = useState(false)
    const [activeAdmission, setActiveAdmission] = useState<any | null>(null)
    const [admissionMeds, setAdmissionMeds] = useState<any[]>([])

    const fetchHistory = async (search?: string) => {
        setLoading(true)
        try {
            const data = await getAllAdmissionsHistory(search)
            setHistory(data)
        } catch (error) {
            console.error('Failed to fetch hospital history:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchHistory(searchTerm)
    }

    const openRecord = async (adm: any) => {
        try {
            const meds = await getAllAdmissionMedications(adm.id)
            setAdmissionMeds(meds)
            setActiveAdmission(adm)
            setShowRecordModal(true)
        } catch (error) {
            console.error('Failed to load record:', error)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
        }}>
            <div style={{
                background: 'linear-gradient(180deg, var(--bg-primary) 0%, rgba(15, 33, 53, 0.95) 100%)',
                borderRadius: '16px',
                width: '100%', maxWidth: '1000px',
                height: '85vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div>
                        <h2 className="text-2xl font-bold" style={{ margin: 0, fontFamily: 'var(--font-montserrat)', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🏥</span>
                            Histórico do Hospital
                        </h2>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-montserrat)' }}>
                            Consulte as internações anteriores e ativas de toda a clínica
                        </p>
                    </div>
                    <button type="button" onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer',
                        width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
                        &times;
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '20px 32px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar por nome do paciente..."
                            style={{ flex: 1, fontFamily: 'var(--font-montserrat)' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" style={{ fontFamily: 'var(--font-montserrat)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🔍</span> Pesquisar
                        </button>
                    </form>
                </div>

                {/* List Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Carregando histórico...
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                            <div style={{ fontSize: '3rem', margin: '0 0 16px' }}>📂</div>
                            <h3 style={{ margin: '0 0 8px', color: '#fff', fontFamily: 'var(--font-montserrat)' }}>Nenhum registro encontrado</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Tente buscar por um nome diferente ou limpe o filtro de busca.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {history.map((adm) => {
                                const isDischarged = adm.status === 'discharged';
                                return (
                                    <div key={adm.id} style={{
                                        background: 'rgba(27, 59, 90, 0.4)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        border: `1px solid ${isDischarged ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.3)'}`,
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#fff', fontFamily: 'var(--font-montserrat)' }}>
                                                    {adm.pets?.name || 'Pet Removido'}
                                                </h4>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Tutor: {adm.pets?.customers?.name || 'N/A'}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', borderRadius: '12px',
                                                background: isDischarged ? 'rgba(100, 116, 139, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: isDischarged ? '#94a3b8' : '#10B981',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {isDischarged ? 'ALTA' : 'INTERNADO'}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                            <div style={{ marginBottom: '4px' }}><strong>Entrada:</strong> {new Date(adm.admitted_at).toLocaleDateString()} às {new Date(adm.admitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            {isDischarged && adm.discharged_at && (
                                                <div style={{ marginBottom: '4px' }}><strong>Saída:</strong> {new Date(adm.discharged_at).toLocaleDateString()} às {new Date(adm.discharged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            )}
                                            <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
                                                Setor: {adm.hospital_beds?.hospital_wards?.name || 'N/A'} <br />
                                                Leito: {adm.hospital_beds?.name || 'N/A'}
                                            </div>
                                        </div>

                                        <p style={{ fontSize: '0.85rem', margin: '12px 0', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            <strong>Motivo:</strong> {adm.reason}
                                        </p>

                                        <button
                                            onClick={() => openRecord(adm)}
                                            style={{
                                                width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                                                color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-montserrat)',
                                                transition: 'all 0.2s', marginTop: '4px'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                        >
                                            Abrir Prontuário
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Prontuário Renderizado Acima */}
            {showRecordModal && activeAdmission && (
                <InternmentRecordModal
                    admission={activeAdmission}
                    activeMedications={admissionMeds}
                    onClose={() => setShowRecordModal(false)}
                    onSuccess={() => {
                        // Opcional: Atualizar algo se necessário, mas histórico geralmente é leitura profunda
                        if (activeAdmission.status === 'active') {
                            getAllAdmissionMedications(activeAdmission.id).then(setAdmissionMeds);
                        }
                    }}
                />
            )}
        </div>
    )
}
