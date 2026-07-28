'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getLabRequests, createLabRequest, getLabExamsCatalog, LabExam } from '@/app/actions/lab-actions'
import LabResultModal from '@/components/LabResultModal'
import PageHelpModal from '@/components/ui/PageHelpModal'

export default function LaboratorioDashboardPage() {
    const [requests, setRequests] = useState<any[]>([])
    const [examsCatalog, setExamsCatalog] = useState<LabExam[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Modais
    const [showNewRequestModal, setShowNewRequestModal] = useState(false)
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
    const [readOnlyReport, setReadOnlyReport] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form Nova Requisição
    const [petsList, setPetsList] = useState<any[]>([])
    const [selectedPetId, setSelectedPetId] = useState('')
    const [selectedExamId, setSelectedExamId] = useState('')
    const [notes, setNotes] = useState('')

    const loadData = async () => {
        setLoading(true)
        const [reqs, catalog] = await Promise.all([
            getLabRequests(),
            getLabExamsCatalog()
        ])
        setRequests(reqs)
        setExamsCatalog(catalog)
        setLoading(false)
    }

    useEffect(() => {
        loadData()

        // Buscar lista rápida de pets para o formulário de requisição
        fetch('/api/pets-list')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPetsList(data)
            })
            .catch(() => {})
    }, [])

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const formData = new FormData()
        formData.append('pet_id', selectedPetId)
        formData.append('exam_id', selectedExamId)
        formData.append('notes', notes)

        const res = await createLabRequest(formData)
        setSubmitting(false)

        if (res.success) {
            setShowNewRequestModal(false)
            setSelectedPetId('')
            setSelectedExamId('')
            setNotes('')
            await loadData()
        } else {
            alert(res.message || 'Erro ao criar requisição de exame')
        }
    }

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter
            const term = searchTerm.toLowerCase().trim()
            const matchesSearch = !term || (
                r.pets?.name?.toLowerCase().includes(term) ||
                r.customers?.name?.toLowerCase().includes(term) ||
                r.lab_exams?.name?.toLowerCase().includes(term) ||
                r.pets?.physical_file_number?.toLowerCase().includes(term)
            )
            return matchesStatus && matchesSearch
        })
    }, [requests, statusFilter, searchTerm])

    // Estatísticas rápidos
    const stats = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            completed: requests.filter(r => r.status === 'completed').length
        }
    }, [requests])

    return (
        <div className="container p-6 animate-fadeIn" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h1 className="text-3xl font-bold text-coral" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🔬 Módulo de Laboratório & Laudos
                        </h1>
                        <PageHelpModal topic="laboratorio" />
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Gerencie pedidos de exames laboratoriais, laude resultados com parâmetros por idade e imprima laudos técnicos.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href="/owner/laboratorio/parametros" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        ⚙️ Cadastro de Exames & Referências
                    </Link>
                    <button onClick={() => setShowNewRequestModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>＋</span> Solicitar Exame
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid var(--color-coral)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Total de Exames
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-coral)' }}>
                        {stats.total}
                    </span>
                </div>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid #F59E0B' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Aguardando Laudo
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B' }}>
                        {stats.pending}
                    </span>
                </div>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid #10B981' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Laudos Concluídos
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981' }}>
                        {stats.completed}
                    </span>
                </div>
            </div>

            {/* Barra de Filtro e Busca */}
            <div className="card glass p-4 mb-6" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar por pet, tutor, exame ou nº da ficha..."
                        className="input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.6rem 1rem 0.6rem 2.2rem', width: '100%', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {['all', 'pending', 'completed'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            style={{
                                padding: '0.45rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                border: statusFilter === st ? '2px solid var(--color-coral)' : '1px solid var(--card-border)',
                                background: statusFilter === st ? 'rgba(240, 140, 152, 0.15)' : 'var(--bg-tertiary)',
                                color: statusFilter === st ? 'var(--color-coral)' : 'var(--text-primary)'
                            }}
                        >
                            {st === 'all' ? 'Todos' : st === 'pending' ? '⏳ Aguardando' : '✅ Laudados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabela de Requisições */}
            {loading ? (
                <div className="card glass p-12 text-center">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Carregando requisições do laboratório...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="card glass p-12 text-center" style={{ border: '2px dashed var(--card-border)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔬</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Nenhuma requisição encontrada
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
                        Solicite novos exames para os pets ou configure os parâmetros e valores de referência por idade no catálogo.
                    </p>
                    <button onClick={() => setShowNewRequestModal(true)} className="btn btn-primary">
                        ＋ Solicitar Primeiro Exame
                    </button>
                </div>
            ) : (
                <div className="card glass p-0 overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Data / Ficha</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Paciente (Pet)</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Tutor</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Exame Solicitado</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'center' }}>Ações / Laudo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req, idx) => (
                                    <tr
                                        key={req.id}
                                        style={{
                                            borderBottom: idx === filteredRequests.length - 1 ? 'none' : '1px solid var(--card-border)',
                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                                        }}
                                    >
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                                            <strong style={{ display: 'block' }}>{new Date(req.requested_at).toLocaleDateString('pt-BR')}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Ficha #{req.pets?.physical_file_number || req.id.substring(0, 8)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            🐾 {req.pets?.name}
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                                {req.pets?.species === 'cat' ? 'Gato' : 'Cão'} | {req.pets?.breed || 'SRD'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                                            👤 {req.customers?.name || 'Não informado'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-sky-dark, #00e4ce)' }}>
                                            🧪 {req.lab_exams?.name}
                                        </td>
                                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                                            {req.status === 'completed' ? (
                                                <span className="badge badge-confirmed" style={{ fontSize: '0.75rem' }}>✅ Laudado</span>
                                            ) : (
                                                <span className="badge badge-pending" style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>⏳ Aguardando</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequestId(req.id)
                                                        setReadOnlyReport(req.status === 'completed')
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                >
                                                    {req.status === 'completed' ? '📄 Ver / Imprimir Laudo' : '✏️ Preencher Laudo'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Nova Requisição de Exame */}
            {showNewRequestModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem',
                        width: '100%', maxWidth: '550px', border: '1px solid var(--card-border)', color: 'var(--text-primary)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-coral)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🔬 Nova Solicitação de Exame
                            </h2>
                            <button onClick={() => setShowNewRequestModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                    Selecione o Paciente (Pet) *
                                </label>
                                <select
                                    required
                                    className="input"
                                    value={selectedPetId}
                                    onChange={(e) => setSelectedPetId(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem' }}
                                >
                                    <option value="">Selecione o Pet...</option>
                                    {petsList.map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                            🐾 {p.name} {p.physical_file_number ? `(Ficha #${p.physical_file_number})` : ''} - Tutor: {p.customer_name || 'N/I'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                    Exame Laboratorial Solicitado *
                                </label>
                                <select
                                    required
                                    className="input"
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem' }}
                                >
                                    <option value="">Selecione o Exame do Catálogo...</option>
                                    {examsCatalog.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            🧪 {e.name} ({e.category}) - R$ {e.base_price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                {examsCatalog.length === 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                                        Nenhum exame cadastrado no catálogo. <Link href="/owner/laboratorio/parametros">Cadastre exames aqui</Link>.
                                    </span>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                    Observações da Amostra / Instruções (Opcional)
                                </label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Ex: Jejum de 8 horas. Amostra de sangue total em EDTA."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowNewRequestModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }}>
                                    {submitting ? 'Solicitando...' : '➕ Confirmar Solicitação'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Preenchimento / Visualização do Laudo */}
            {selectedRequestId && (
                <LabResultModal
                    requestId={selectedRequestId}
                    readOnly={readOnlyReport}
                    onClose={() => setSelectedRequestId(null)}
                    onSuccess={loadData}
                />
            )}
        </div>
    )
}
