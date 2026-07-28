'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
    getLabExamsCatalog,
    saveLabExam,
    deleteLabExam,
    saveLabParameter,
    deleteLabParameter,
    LabExam
} from '@/app/actions/lab-actions'
import PageHelpModal from '@/components/ui/PageHelpModal'

export default function LabParametersPage() {
    const [exams, setExams] = useState<LabExam[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedExam, setSelectedExam] = useState<LabExam | null>(null)

    // Modais
    const [showExamModal, setShowExamModal] = useState(false)
    const [showParamModal, setShowParamModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [editingExam, setEditingExam] = useState<LabExam | null>(null)

    // Form Exame
    const [examName, setExamName] = useState('')
    const [examCategory, setExamCategory] = useState('Hematologia')
    const [examBasePrice, setExamBasePrice] = useState('0.00')
    const [examDesc, setExamDesc] = useState('')

    // Form Parâmetro + Faixas de Referência por Idade/Espécie
    const [paramName, setParamName] = useState('')
    const [paramUnit, setParamUnit] = useState('')
    const [rangesList, setRangesList] = useState<any[]>([
        { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
    ])

    const loadCatalog = async () => {
        setLoading(true)
        const data = await getLabExamsCatalog()
        setExams(data)
        if (data.length > 0 && !selectedExam) {
            setSelectedExam(data[0])
        } else if (selectedExam) {
            const updated = data.find(e => e.id === selectedExam.id)
            setSelectedExam(updated || data[0] || null)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadCatalog()
    }, [])

    const handleOpenExamModal = (item?: LabExam) => {
        if (item) {
            setEditingExam(item)
            setExamName(item.name)
            setExamCategory(item.category)
            setExamBasePrice(item.base_price.toString())
            setExamDesc(item.description || '')
        } else {
            setEditingExam(null)
            setExamName('')
            setExamCategory('Hematologia')
            setExamBasePrice('0.00')
            setExamDesc('')
        }
        setShowExamModal(true)
    }

    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const formData = new FormData()
        if (editingExam) formData.append('id', editingExam.id)
        formData.append('name', examName)
        formData.append('category', examCategory)
        formData.append('base_price', examBasePrice)
        formData.append('description', examDesc)

        const res = await saveLabExam(formData)
        setSubmitting(false)
        if (res.success) {
            setShowExamModal(false)
            await loadCatalog()
        } else {
            alert(res.message || 'Erro ao salvar exame')
        }
    }

    const handleDeleteExam = async (id: string, name: string) => {
        if (!confirm(`Deseja desativar o exame "${name}" do catálogo?`)) return
        const res = await deleteLabExam(id)
        if (res.success) {
            await loadCatalog()
        } else {
            alert(res.message)
        }
    }

    const handleOpenParamModal = () => {
        setParamName('')
        setParamUnit('')
        setRangesList([
            { species: 'dog', age_category: 'puppy', min_value: '', max_value: '', text_reference: '' },
            { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' },
            { species: 'dog', age_category: 'senior', min_value: '', max_value: '', text_reference: '' },
            { species: 'cat', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
        ])
        setShowParamModal(true)
    }

    const handleSaveParameter = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedExam) return
        setSubmitting(true)

        const res = await saveLabParameter(selectedExam.id, paramName, paramUnit, rangesList)
        setSubmitting(false)
        if (res.success) {
            setShowParamModal(false)
            await loadCatalog()
        } else {
            alert(res.message || 'Erro ao salvar parâmetro')
        }
    }

    const handleDeleteParam = async (paramId: string) => {
        if (!confirm('Deseja excluir este parâmetro do exame?')) return
        const res = await deleteLabParameter(paramId)
        if (res.success) {
            await loadCatalog()
        } else {
            alert(res.message)
        }
    }

    const addRangeRow = () => {
        setRangesList([
            ...rangesList,
            { species: 'dog', age_category: 'adult', min_value: '', max_value: '', text_reference: '' }
        ])
    }

    const removeRangeRow = (idx: number) => {
        setRangesList(rangesList.filter((_, i) => i !== idx))
    }

    const updateRangeRow = (idx: number, field: string, value: any) => {
        const copy = [...rangesList]
        copy[idx] = { ...copy[idx], [field]: value }
        setRangesList(copy)
    }

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
                            ⚙️ Configuração de Exames & Referências por Idade
                        </h1>
                        <PageHelpModal topic="laboratorio-parametros" />
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Cadastre analitos e configure tabelas de valores de referência baseadas na espécie e faixa etária do pet.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href="/owner/laboratorio" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        📋 Requisições & Laudos
                    </Link>
                    <button onClick={() => handleOpenExamModal()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>＋</span> Novo Exame
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="card glass p-12 text-center">
                    <p style={{ color: 'var(--text-muted)' }}>Carregando catálogo de exames e parâmetros...</p>
                </div>
            ) : exams.length === 0 ? (
                <div className="card glass p-12 text-center" style={{ border: '2px dashed var(--card-border)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧪</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Nenhum exame cadastrado no laboratório
                    </h3>
                    <button onClick={() => handleOpenExamModal()} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        ＋ Cadastrar Primeiro Exame
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    {/* Coluna Esquerda: Lista de Exames */}
                    <div className="card glass p-4" style={{ height: 'fit-content' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                Exames Cadastrados ({exams.length})
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {exams.map(e => (
                                <div
                                    key={e.id}
                                    onClick={() => setSelectedExam(e)}
                                    style={{
                                        padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                                        border: selectedExam?.id === e.id ? '2px solid var(--color-coral)' : '1px solid var(--card-border)',
                                        background: selectedExam?.id === e.id ? 'rgba(240, 140, 152, 0.15)' : 'var(--bg-tertiary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>🧪 {e.name}</strong>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                onClick={(evt) => { evt.stopPropagation(); handleOpenExamModal(e) }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                                title="Editar exame"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(evt) => { evt.stopPropagation(); handleDeleteExam(e.id, e.name) }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                                title="Desativar exame"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                        <span>Setor: {e.category}</span>
                                        <span>{(e.parameters || []).length} analito(s)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coluna Direita: Parâmetros & Valores de Referência do Exame Selecionado */}
                    {selectedExam && (
                        <div className="card glass p-6">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-sky-dark, #00e4ce)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        🧪 Parâmetros de: {selectedExam.name}
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                                        Setor: {selectedExam.category} | Valor Base: R$ {selectedExam.base_price.toFixed(2)}
                                    </p>
                                </div>
                                <button onClick={handleOpenParamModal} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                    ＋ Adicionar Parâmetro / Analito
                                </button>
                            </div>

                            {/* Lista de Parâmetros do Exame */}
                            {(selectedExam.parameters || []).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--card-border)', borderRadius: '8px' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Nenhum parâmetro cadastrado para este exame. Adicione analitos (ex: Eritrócitos, Hemoglobina, Ureia) e configure as tabelas de referência por idade.
                                    </p>
                                    <button onClick={handleOpenParamModal} className="btn btn-primary mt-2">
                                        ＋ Criar Primeiro Parâmetro
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {selectedExam.parameters?.map((p) => (
                                        <div key={p.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                                                    {p.unit && <span style={{ fontSize: '0.8rem', color: 'var(--color-sky)', marginLeft: '0.5rem' }}>({p.unit})</span>}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteParam(p.id)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '5px', padding: '3px 8px', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                                                >
                                                    🗑️ Excluir Parâmetro
                                                </button>
                                            </div>

                                            {/* Tabela de Referências por Idade / Espécie do Parâmetro */}
                                            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                                    Valores de Referência por Espécie / Idade:
                                                </span>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                                                    {p.ranges.map((r, rIdx) => (
                                                        <div key={rIdx} style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--card-border)' }}>
                                                            <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-coral)' }}>
                                                                {r.species === 'cat' ? '🐱 Gato' : r.species === 'dog' ? '🐶 Cão' : '🐾 Geral'} - {
                                                                    r.age_category === 'puppy' ? 'Filhote (< 1 ano)' :
                                                                    r.age_category === 'senior' ? 'Sênior (> 7 anos)' : 'Adulto (1 a 7 anos)'
                                                                }
                                                            </span>
                                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                                                {r.text_reference ? r.text_reference : (
                                                                    r.min_value !== null && r.max_value !== null ? `${r.min_value} - ${r.max_value}` :
                                                                    r.min_value !== null ? `>= ${r.min_value}` :
                                                                    r.max_value !== null ? `<= ${r.max_value}` : 'S/R'
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Cadastro / Edição do Exame */}
            {showExamModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '500px', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-coral)' }}>
                            🧪 {editingExam ? 'Editar Exame' : 'Novo Exame no Catálogo'}
                        </h2>
                        <form onSubmit={handleSaveExam} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Nome do Exame *</label>
                                <input type="text" required placeholder="Ex: Hemograma Completo, Bioquímico Renal" className="input" value={examName} onChange={e => setExamName(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Setor / Categoria</label>
                                    <select className="input" value={examCategory} onChange={e => setExamCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                                        <option value="Hematologia">Hematologia</option>
                                        <option value="Bioquímica">Bioquímica</option>
                                        <option value="Urianálise">Urianálise</option>
                                        <option value="Parasitologia">Parasitologia</option>
                                        <option value="Imagem">Imagem / Ultrassom</option>
                                        <option value="Geral">Geral</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Preço Base (R$)</label>
                                    <input type="number" step="0.01" min="0" className="input" value={examBasePrice} onChange={e => setExamBasePrice(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Descrição / Recomendações</label>
                                <textarea className="input" rows={2} placeholder="Ex: Jejum recomendado de 8 horas..." value={examDesc} onChange={e => setExamDesc(e.target.value)} style={{ width: '100%', padding: '0.5rem', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }}>
                                    {submitting ? 'Salvando...' : '💾 Salvar Exame'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Adição de Parâmetro e Faixas de Referência por Idade */}
            {showParamModal && selectedExam && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-sky-dark, #00e4ce)' }}>
                                🔬 Novo Parâmetro / Analito: {selectedExam.name}
                            </h2>
                            <button onClick={() => setShowParamModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSaveParameter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Nome do Analito / Parâmetro *</label>
                                    <input type="text" required placeholder="Ex: Eritrócitos, Hemoglobina, Ureia" className="input" value={paramName} onChange={e => setParamName(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Unidade de Medida</label>
                                    <input type="text" placeholder="Ex: 10^6/µL, g/dL, mg/dL" className="input" value={paramUnit} onChange={e => setParamUnit(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                                </div>
                            </div>

                            {/* Faixas de Referência por Idade / Espécie */}
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--color-coral)', textTransform: 'uppercase' }}>
                                        📊 Faixas de Referência por Espécie e Idade
                                    </strong>
                                    <button type="button" onClick={addRangeRow} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                                        ＋ Nova Regra por Idade
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {rangesList.map((r, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 20px', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px' }}>
                                            <select className="input" value={r.species} onChange={e => updateRangeRow(idx, 'species', e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }}>
                                                <option value="dog">🐶 Cão (Canino)</option>
                                                <option value="cat">🐱 Gato (Felino)</option>
                                                <option value="all">🐾 Todas Espécies</option>
                                            </select>

                                            <select className="input" value={r.age_category} onChange={e => updateRangeRow(idx, 'age_category', e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }}>
                                                <option value="puppy">Filhote (&lt; 1 ano)</option>
                                                <option value="adult">Adulto (1 a 7 anos)</option>
                                                <option value="senior">Sênior (&gt; 7 anos)</option>
                                                <option value="all">Todas as Idades</option>
                                            </select>

                                            <input type="number" step="0.0001" placeholder="Mínimo" className="input" value={r.min_value} onChange={e => updateRangeRow(idx, 'min_value', e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                                            <input type="number" step="0.0001" placeholder="Máximo" className="input" value={r.max_value} onChange={e => updateRangeRow(idx, 'max_value', e.target.value)} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />

                                            {rangesList.length > 1 && (
                                                <button type="button" onClick={() => removeRangeRow(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowParamModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }}>
                                    {submitting ? 'Salvando...' : '💾 Salvar Parâmetro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
