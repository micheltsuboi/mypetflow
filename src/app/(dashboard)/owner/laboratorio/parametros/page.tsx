'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    getLabExamsListMinimal,
    getLabExamDetails,
    saveCompleteLabExam,
    deleteLabExam,
    LabExamMinimal,
    LabExam
} from '@/app/actions/lab-actions'
import PageHelpModal from '@/components/ui/PageHelpModal'

interface ParameterDraft {
    id?: string
    name: string
    unit: string
    ranges: Array<{
        species: string
        age_category: string
        min_value: string
        max_value: string
        text_reference: string
    }>
}

export default function LabParametersPage() {
    const [exams, setExams] = useState<LabExamMinimal[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('ALL')

    // Modal de Edição Unificada
    const [showExamModal, setShowExamModal] = useState(false)
    const [loadingExamDetails, setLoadingExamDetails] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form Exame + Lista de Parâmetros
    const [editingExamId, setEditingExamId] = useState<string | null>(null)
    const [examName, setExamName] = useState('')
    const [examCategory, setExamCategory] = useState('Hematologia')
    const [examBasePrice, setExamBasePrice] = useState('0.00')
    const [examDesc, setExamDesc] = useState('')
    const [parametersList, setParametersList] = useState<ParameterDraft[]>([])

    const loadMinimalList = async () => {
        setLoading(true)
        const data = await getLabExamsListMinimal()
        setExams(data)
        setLoading(false)
    }

    useEffect(() => {
        loadMinimalList()
    }, [])

    const handleOpenExamModal = async (examId?: string) => {
        if (examId) {
            setEditingExamId(examId)
            setShowExamModal(true)
            setLoadingExamDetails(true)
            const details = await getLabExamDetails(examId)
            setLoadingExamDetails(false)

            if (details) {
                setExamName(details.name)
                setExamCategory(details.category || 'Hematologia')
                setExamBasePrice(details.base_price ? details.base_price.toString() : '0.00')
                setExamDesc(details.description || '')

                const formattedParams: ParameterDraft[] = (details.parameters || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    unit: p.unit || '',
                    ranges: (p.ranges || []).length > 0 ? p.ranges.map(r => ({
                        species: r.species || 'dog',
                        age_category: r.age_category || 'adult',
                        min_value: r.min_value !== null && r.min_value !== undefined ? r.min_value.toString() : '',
                        max_value: r.max_value !== null && r.max_value !== undefined ? r.max_value.toString() : '',
                        text_reference: r.text_reference || ''
                    })) : [
                        { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
                    ]
                }))
                setParametersList(formattedParams)
            }
        } else {
            setEditingExamId(null)
            setExamName('')
            setExamCategory('Hematologia')
            setExamBasePrice('0.00')
            setExamDesc('')
            setParametersList([
                {
                    name: '',
                    unit: '',
                    ranges: [
                        { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' },
                        { species: 'cat', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
                    ]
                }
            ])
            setShowExamModal(true)
        }
    }

    const handleSaveCompleteExam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!examName.trim()) return alert('Informe o nome do exame.')
        
        setSubmitting(true)

        const payload = {
            id: editingExamId || undefined,
            name: examName.trim(),
            category: examCategory,
            base_price: parseFloat(examBasePrice) || 0,
            description: examDesc,
            parameters: parametersList
                .filter(p => p.name.trim() !== '')
                .map(p => ({
                    id: p.id,
                    name: p.name.trim(),
                    unit: p.unit.trim(),
                    ranges: p.ranges.map(r => ({
                        species: r.species,
                        age_category: r.age_category,
                        min_value: r.min_value !== '' ? parseFloat(r.min_value) : null,
                        max_value: r.max_value !== '' ? parseFloat(r.max_value) : null,
                        text_reference: r.text_reference || null
                    }))
                }))
        }

        const res = await saveCompleteLabExam(payload)
        setSubmitting(false)

        if (res.success) {
            setShowExamModal(false)
            await loadMinimalList()
        } else {
            alert(res.message || 'Erro ao salvar exame completo.')
        }
    }

    const handleDeleteExam = async (id: string, name: string) => {
        if (!confirm(`Deseja desativar o exame "${name}" do catálogo?`)) return
        const res = await deleteLabExam(id)
        if (res.success) {
            await loadMinimalList()
        } else {
            alert(res.message)
        }
    }

    // Handlers da lista de parâmetros no modal
    const addParameterToForm = () => {
        setParametersList([
            ...parametersList,
            {
                name: '',
                unit: '',
                ranges: [
                    { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' },
                    { species: 'cat', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
                ]
            }
        ])
    }

    const removeParameterFromForm = (pIdx: number) => {
        setParametersList(parametersList.filter((_, idx) => idx !== pIdx))
    }

    const updateParameterField = (pIdx: number, field: keyof ParameterDraft, value: any) => {
        const copy = [...parametersList]
        copy[pIdx] = { ...copy[pIdx], [field]: value }
        setParametersList(copy)
    }

    const addRangeToParameter = (pIdx: number) => {
        const copy = [...parametersList]
        copy[pIdx].ranges.push({ species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' })
        setParametersList(copy)
    }

    const removeRangeFromParameter = (pIdx: number, rIdx: number) => {
        const copy = [...parametersList]
        copy[pIdx].ranges = copy[pIdx].ranges.filter((_, idx) => idx !== rIdx)
        setParametersList(copy)
    }

    const updateRangeField = (pIdx: number, rIdx: number, field: string, value: any) => {
        const copy = [...parametersList]
        copy[pIdx].ranges[rIdx] = { ...copy[pIdx].ranges[rIdx], [field]: value }
        setParametersList(copy)
    }

    const filteredExams = exams.filter(e => {
        const matchesTerm = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter
        return matchesTerm && matchesCat
    })

    return (
        <div className="container p-6 animate-fadeIn" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link href="/owner/laboratorio" style={{ textDecoration: 'none', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            &larr;
                        </Link>
                        <h1 className="text-3xl font-bold text-coral" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚙️ Catálogo de Exames & Parâmetros de Referência
                        </h1>
                        <PageHelpModal topic="laboratorio-parametros" />
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Cadastre exames e analitos com faixas de referência por idade e espécie em um único local otimizado.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href="/owner/laboratorio" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        📋 Requisições & Laudos
                    </Link>
                    <button onClick={() => handleOpenExamModal()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>＋</span> Novo Exame Completo
                    </button>
                </div>
            </div>

            {/* Filtro e Busca */}
            <div className="card glass p-4 mb-6" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 2, minWidth: '220px' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="🔍 Buscar exame por nome ou categoria..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '160px' }}>
                    <select
                        className="input"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem' }}
                    >
                        <option value="ALL">Todas as Categorias</option>
                        <option value="Hematologia">Hematologia</option>
                        <option value="Bioquímica">Bioquímica</option>
                        <option value="Urianálise">Urianálise</option>
                        <option value="Parasitologia">Parasitologia</option>
                        <option value="Geral">Geral</option>
                    </select>
                </div>
            </div>

            {/* Tabela Limpa de Exames */}
            {loading ? (
                <div className="card glass p-12 text-center">
                    <p style={{ color: 'var(--text-muted)' }}>Carregando catálogo de exames...</p>
                </div>
            ) : filteredExams.length === 0 ? (
                <div className="card glass p-12 text-center" style={{ border: '2px dashed var(--card-border)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧪</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Nenhum exame encontrado
                    </h3>
                    <button onClick={() => handleOpenExamModal()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        ＋ Cadastrar Novo Exame Completo
                    </button>
                </div>
            ) : (
                <div className="card glass p-0" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem' }}>Exame</th>
                                <th style={{ padding: '1rem' }}>Setor / Categoria</th>
                                <th style={{ padding: '1rem' }}>Preço Base</th>
                                <th style={{ padding: '1rem' }}>Analitos / Parâmetros</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExams.map((e) => (
                                <tr key={e.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>🧪</span> {e.name}
                                        </div>
                                        {e.description && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {e.description}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(0, 228, 206, 0.12)', color: 'var(--color-sky-dark, #00e4ce)', textTransform: 'uppercase' }}>
                                            {e.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        R$ {e.base_price.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className="badge badge-neutral" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                            {e.parameter_count || 0} parâmetro(s)
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleOpenExamModal(e.id)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.8rem', padding: '6px 12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                ✏️ Editar Exame & Parâmetros
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExam(e.id, e.name)}
                                                style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                title="Desativar exame"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Unificado: Cadastro / Edição do Exame e seus Parâmetros */}
            {showExamModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--card-border)', color: 'var(--text-primary)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-coral)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🧪 {editingExamId ? 'Editar Exame e Parâmetros' : 'Novo Exame Completo'}
                            </h2>
                            <button onClick={() => setShowExamModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {loadingExamDetails ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Carregando detalhes e analitos do exame...
                            </div>
                        ) : (
                            <form onSubmit={handleSaveCompleteExam} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* SEÇÃO 1: DADOS DO EXAME */}
                                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-sky-dark, #00e4ce)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        📋 1. Informações Básicas do Exame
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.3rem' }}>Nome do Exame *</label>
                                            <input type="text" required placeholder="Ex: Hemograma Completo" className="input" value={examName} onChange={e => setExamName(e.target.value)} style={{ width: '100%', padding: '0.55rem' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.3rem' }}>Setor / Categoria</label>
                                            <select className="input" value={examCategory} onChange={e => setExamCategory(e.target.value)} style={{ width: '100%', padding: '0.55rem' }}>
                                                <option value="Hematologia">Hematologia</option>
                                                <option value="Bioquímica">Bioquímica</option>
                                                <option value="Urianálise">Urianálise</option>
                                                <option value="Parasitologia">Parasitologia</option>
                                                <option value="Imagem">Imagem / Ultrassom</option>
                                                <option value="Geral">Geral</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.3rem' }}>Preço Base (R$)</label>
                                            <input type="number" step="0.01" min="0" className="input" value={examBasePrice} onChange={e => setExamBasePrice(e.target.value)} style={{ width: '100%', padding: '0.55rem' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.3rem' }}>Descrição / Orientações</label>
                                        <input type="text" className="input" placeholder="Ex: Jejum recomendado de 8 horas, coleta em EDTA..." value={examDesc} onChange={e => setExamDesc(e.target.value)} style={{ width: '100%', padding: '0.55rem' }} />
                                    </div>
                                </div>

                                {/* SEÇÃO 2: PARÂMETROS / ANALITOS DO EXAME */}
                                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-sky-dark, #00e4ce)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            📊 2. Parâmetros / Analitos & Faixas de Referência por Idade
                                        </h3>
                                        <button type="button" onClick={addParameterToForm} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px', fontWeight: 700 }}>
                                            ＋ Adicionar Analito / Parâmetro
                                        </button>
                                    </div>

                                    {parametersList.length === 0 ? (
                                        <p style={{ textCenter: 'center', color: 'var(--text-muted)', padding: '1rem', border: '1px dashed var(--card-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                            Nenhum analito adicionado. Clique no botão acima para incluir os parâmetros deste exame.
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {parametersList.map((p, pIdx) => (
                                                <div key={pIdx} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>Nome do Analito / Parâmetro *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="Ex: Eritrócitos, Hemoglobina, Ureia..."
                                                                className="input"
                                                                value={p.name}
                                                                onChange={e => updateParameterField(pIdx, 'name', e.target.value)}
                                                                style={{ width: '100%', padding: '0.45rem' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>Unidade (Ex: g/dL, %)</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Ex: x10^6/µL"
                                                                className="input"
                                                                value={p.unit}
                                                                onChange={e => updateParameterField(pIdx, 'unit', e.target.value)}
                                                                style={{ width: '100%', padding: '0.45rem' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeParameterFromForm(pIdx)}
                                                                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Remover parâmetro"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Tabelinha de Faixas de Referência por Idade/Espécie */}
                                                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-coral)', textTransform: 'uppercase' }}>
                                                                Regras de Referência (Mín / Máx por Idade):
                                                            </span>
                                                            <button type="button" onClick={() => addRangeToParameter(pIdx)} style={{ background: 'none', border: 'none', color: 'var(--color-sky-dark, #00e4ce)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                                                ＋ Adicionar Faixa
                                                            </button>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                            {p.ranges.map((r, rIdx) => (
                                                                <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr 24px', gap: '0.4rem', alignItems: 'center' }}>
                                                                    <select className="input" value={r.species} onChange={e => updateRangeField(pIdx, rIdx, 'species', e.target.value)} style={{ padding: '0.3rem', fontSize: '0.78rem' }}>
                                                                        <option value="dog">🐶 Cão</option>
                                                                        <option value="cat">🐱 Gato</option>
                                                                        <option value="all">🐾 Todas Espécies</option>
                                                                    </select>
                                                                    <select className="input" value={r.age_category} onChange={e => updateRangeField(pIdx, rIdx, 'age_category', e.target.value)} style={{ padding: '0.3rem', fontSize: '0.78rem' }}>
                                                                        <option value="puppy">Filhote (&lt; 1 ano)</option>
                                                                        <option value="adult">Adulto (1 a 7 anos)</option>
                                                                        <option value="senior">Sênior (&gt; 7 anos)</option>
                                                                        <option value="all">Todas as Idades</option>
                                                                    </select>
                                                                    <input type="number" step="0.0001" placeholder="Mínimo" className="input" value={r.min_value} onChange={e => updateRangeField(pIdx, rIdx, 'min_value', e.target.value)} style={{ padding: '0.3rem', fontSize: '0.78rem' }} />
                                                                    <input type="number" step="0.0001" placeholder="Máximo" className="input" value={r.max_value} onChange={e => updateRangeField(pIdx, rIdx, 'max_value', e.target.value)} style={{ padding: '0.3rem', fontSize: '0.78rem' }} />
                                                                    <button type="button" onClick={() => removeRangeFromParameter(pIdx, rIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>×</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, padding: '0.8rem', fontWeight: 800, fontSize: '0.95rem' }}>
                                        {submitting ? 'Salvando...' : '💾 Salvar Exame e Parâmetros'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
