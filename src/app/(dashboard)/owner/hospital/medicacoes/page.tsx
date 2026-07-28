'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
    getHospitalMedicationCatalog,
    saveHospitalMedication,
    deleteHospitalMedication,
    HospitalMedicationItem
} from '@/app/actions/hospital-medications'
import PageHelpModal from '@/components/ui/PageHelpModal'

export default function HospitalMedicationsPage() {
    const [medications, setMedications] = useState<HospitalMedicationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<HospitalMedicationItem | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Modal Form State
    const [formName, setFormName] = useState('')
    const [formVolumeMl, setFormVolumeMl] = useState<number | string>(50)
    const [formCostPrice, setFormCostPrice] = useState<number | string>(30)
    const [formMarkupPercent, setFormMarkupPercent] = useState<number>(100)
    const [formCustomSalePricePerMl, setFormCustomSalePricePerMl] = useState<string>('')
    const [formNotes, setFormNotes] = useState('')

    const loadData = async () => {
        setLoading(true)
        const data = await getHospitalMedicationCatalog()
        setMedications(data)
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleOpenModal = (item?: HospitalMedicationItem) => {
        setErrorMsg(null)
        if (item) {
            setEditingItem(item)
            setFormName(item.name)
            setFormVolumeMl(item.volume_ml)
            setFormCostPrice(item.cost_price)
            setFormMarkupPercent(item.default_markup_percent || 100)
            setFormCustomSalePricePerMl(item.sale_price_per_ml ? item.sale_price_per_ml.toString() : '')
            setFormNotes(item.notes || '')
        } else {
            setEditingItem(null)
            setFormName('')
            setFormVolumeMl(50)
            setFormCostPrice(30)
            setFormMarkupPercent(100)
            setFormCustomSalePricePerMl('')
            setFormNotes('')
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingItem(null)
        setErrorMsg(null)
    }

    // Cálculos em tempo real para o formulário
    const calculatedCostPerMl = useMemo(() => {
        const vol = parseFloat(formVolumeMl.toString()) || 1
        const cost = parseFloat(formCostPrice.toString()) || 0
        return vol > 0 ? cost / vol : 0
    }, [formVolumeMl, formCostPrice])

    const calculatedPrices = useMemo(() => {
        const costPerMl = calculatedCostPerMl
        const totalCost = parseFloat(formCostPrice.toString()) || 0

        return {
            costPerMl,
            p100Total: totalCost * 2,
            p100PerMl: costPerMl * 2,
            p200PerMl: costPerMl * 3,
            p300PerMl: costPerMl * 4,
            p500PerMl: costPerMl * 6,
        }
    }, [calculatedCostPerMl, formCostPrice])

    const calculatedActiveSalePricePerMl = useMemo(() => {
        if (formCustomSalePricePerMl && parseFloat(formCustomSalePricePerMl) > 0) {
            return parseFloat(formCustomSalePricePerMl)
        }
        return calculatedCostPerMl * (1 + formMarkupPercent / 100)
    }, [calculatedCostPerMl, formMarkupPercent, formCustomSalePricePerMl])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setSubmitting(true)

        try {
            const formData = new FormData()
            if (editingItem) formData.append('id', editingItem.id)
            formData.append('name', formName)
            formData.append('volume_ml', formVolumeMl.toString())
            formData.append('cost_price', formCostPrice.toString())
            formData.append('default_markup_percent', formMarkupPercent.toString())
            if (formCustomSalePricePerMl) {
                formData.append('custom_sale_price_per_ml', formCustomSalePricePerMl)
            }
            formData.append('notes', formNotes)

            const res = await saveHospitalMedication(formData)
            if (res.success) {
                handleCloseModal()
                await loadData()
            } else {
                setErrorMsg(res.message || 'Erro ao salvar medicação')
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro de conexão')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente excluir a medicação "${name}" do catálogo?`)) return
        const res = await deleteHospitalMedication(id)
        if (res.success) {
            await loadData()
        } else {
            alert(res.message || 'Erro ao excluir medicação')
        }
    }

    const filteredMedications = useMemo(() => {
        if (!searchTerm.trim()) return medications
        const term = searchTerm.toLowerCase()
        return medications.filter(m => m.name.toLowerCase().includes(term))
    }, [medications, searchTerm])

    // Formatadores de moeda
    const fmtBrl = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    const fmtBrlMl = (val: number) => {
        return `R$ ${(val || 0).toFixed(2).replace('.', ',')}`
    }

    return (
        <div className="container p-6 animate-fadeIn" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link href="/owner/hospital" style={{ textDecoration: 'none', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            &larr;
                        </Link>
                        <h1 className="text-3xl font-bold text-coral" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            💊 Catálogo de Medicações de Internamento
                        </h1>
                        <PageHelpModal topic="hospital" />
                    </div>
                    <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Cadastre medicamentos, frascos (ML), custos e tabelas de markups para precificação precisa nas aplicações do hospital.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link href="/owner/hospital" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        🛌 Mapa de Leitos
                    </Link>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>＋</span> Novo Medicamento
                    </button>
                </div>
            </div>

            {/* Cards Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid var(--color-coral)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Total no Catálogo
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-coral)' }}>
                        {medications.length}
                    </span>
                </div>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid var(--color-sky)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Custo Médio / ML
                    </span>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-sky)' }}>
                        {fmtBrl(medications.length ? (medications.reduce((acc, m) => acc + m.cost_price_per_ml, 0) / medications.length) : 0)}
                    </span>
                </div>
                <div className="card glass p-4 text-center" style={{ borderLeft: '4px solid #10B981' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        Venda Média / ML
                    </span>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>
                        {fmtBrl(medications.length ? (medications.reduce((acc, m) => acc + m.sale_price_per_ml, 0) / medications.length) : 0)}
                    </span>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="card glass p-4 mb-6" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar medicamento por nome..."
                        className="input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.6rem 1rem 0.6rem 2.2rem', width: '100%', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Exibindo {filteredMedications.length} de {medications.length} medicamento(s)
                </div>
            </div>

            {/* Tabela de Medicações Estilo Excel / Clínica Vitta */}
            {loading ? (
                <div className="card glass p-12 text-center">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Carregando catálogo de medicações...</p>
                </div>
            ) : filteredMedications.length === 0 ? (
                <div className="card glass p-12 text-center" style={{ border: '2px dashed var(--card-border)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💊</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Nenhum medicamento cadastrado
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
                        Cadastre os medicamentos utilizados no seu hospital informando o volume do frasco (ML) e o custo para cálculo automático dos markups por ML.
                    </p>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">
                        ＋ Cadastrar Primeiro Medicamento
                    </button>
                </div>
            ) : (
                <div className="card glass p-0 overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Medicamento</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>ML Frasco</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Preço Custo (Frasco)</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right', color: 'var(--color-sky-dark, #00e4ce)' }}>Custo / ML</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Valor/ML (100%)</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Valor/ML (200%)</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Valor/ML (300%)</th>
                                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Valor/ML (500%)</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'right', color: 'var(--color-coral)' }}>Preço Venda / ML Ativo</th>
                                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMedications.map((item, idx) => {
                                    const cPerMl = item.cost_price_per_ml
                                    const v100 = cPerMl * 2
                                    const v200 = cPerMl * 3
                                    const v300 = cPerMl * 4
                                    const v500 = cPerMl * 6

                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom: idx === filteredMedications.length - 1 ? 'none' : '1px solid var(--card-border)',
                                                background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                                transition: 'background 0.2s ease'
                                            }}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {item.name}
                                                {item.notes && (
                                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                                        {item.notes}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                                                {item.volume_ml} ml
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                                                {fmtBrl(item.cost_price)}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-sky-dark, #00e4ce)' }}>
                                                {fmtBrlMl(cPerMl)}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {fmtBrlMl(v100)}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {fmtBrlMl(v200)}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {fmtBrlMl(v300)}
                                            </td>
                                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {fmtBrlMl(v500)}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--color-coral)', fontSize: '0.95rem' }}>
                                                {fmtBrlMl(item.sale_price_per_ml)}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        style={{
                                                            background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)',
                                                            borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                        title="Editar medicamento"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.name)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem',
                                                            color: '#ef4444'
                                                        }}
                                                        title="Excluir do catálogo"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro / Edição */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem',
                        width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                        border: '1px solid var(--card-border)', color: 'var(--text-primary)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-coral)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                💊 {editingItem ? 'Editar Medicamento' : 'Novo Medicamento no Catálogo'}
                            </h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                    Nome do Medicamento *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Vitamina B12, Dipirona, Mercepton"
                                    className="input"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                        Volume do Frasco (ML) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.1"
                                        step="0.1"
                                        placeholder="Ex: 50"
                                        className="input"
                                        value={formVolumeMl}
                                        onChange={(e) => setFormVolumeMl(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                        Preço de Custo Total (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="Ex: 30.00"
                                        className="input"
                                        value={formCostPrice}
                                        onChange={(e) => setFormCostPrice(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem' }}
                                    />
                                </div>
                            </div>

                            {/* Painel Calculador em Tempo Real (Planilha Clínica Vitta) */}
                            <div style={{
                                background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px',
                                border: '1px solid var(--card-border)'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-sky-dark, #00e4ce)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                                    📊 Cálculo Automático de Custo e Markups
                                </span>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Custo/ML</span>
                                        <strong style={{ fontSize: '0.9rem', color: 'var(--color-sky)' }}>{fmtBrlMl(calculatedPrices.costPerMl)}</strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>100% (/ML)</span>
                                        <strong style={{ fontSize: '0.9rem' }}>{fmtBrlMl(calculatedPrices.p100PerMl)}</strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>200% (/ML)</span>
                                        <strong style={{ fontSize: '0.9rem' }}>{fmtBrlMl(calculatedPrices.p200PerMl)}</strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>300% (/ML)</span>
                                        <strong style={{ fontSize: '0.9rem' }}>{fmtBrlMl(calculatedPrices.p300PerMl)}</strong>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>500% (/ML)</span>
                                        <strong style={{ fontSize: '0.9rem' }}>{fmtBrlMl(calculatedPrices.p500PerMl)}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Seleção de Margem de Venda */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                    Margem de Venda Padrão da Clínica
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[100, 200, 300, 500].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => {
                                                setFormMarkupPercent(m)
                                                setFormCustomSalePricePerMl('')
                                            }}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                                                border: formMarkupPercent === m && !formCustomSalePricePerMl ? '2px solid var(--color-coral)' : '1px solid var(--card-border)',
                                                background: formMarkupPercent === m && !formCustomSalePricePerMl ? 'rgba(240, 140, 152, 0.15)' : 'var(--bg-tertiary)',
                                                color: formMarkupPercent === m && !formCustomSalePricePerMl ? 'var(--color-coral)' : 'var(--text-primary)',
                                                fontWeight: 700, fontSize: '0.85rem'
                                            }}
                                        >
                                            {m}% ({fmtBrlMl(calculatedCostPerMl * (1 + m / 100))})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preço de Venda / ML Customizado */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                                    Ou Preço Customizado por ML (Opcional):
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Ex: ${calculatedActiveSalePricePerMl.toFixed(2)}`}
                                    className="input"
                                    value={formCustomSalePricePerMl}
                                    onChange={(e) => setFormCustomSalePricePerMl(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Valor ativo final de venda por ML: <strong>{fmtBrlMl(calculatedActiveSalePricePerMl)}</strong>
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                    Observações / Instruções (Opcional)
                                </label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Ex: Manter sob refrigeração. Uso exclusivo veterinário."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', resize: 'none' }}
                                />
                            </div>

                            {errorMsg && (
                                <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary"
                                    style={{ flex: 2, padding: '0.75rem', fontWeight: 700 }}
                                >
                                    {submitting ? 'Salvando...' : '💾 Salvar Medicamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
