'use client'

import { useState, useEffect } from 'react'
import { prescreverMedicacao, applyMedicationDose, getMedicationLogs, getHospitalObservations, addHospitalObservation, updateAdmissionSeverity, getAdmissionMedications } from '@/app/actions/hospital'
import { getHospitalMedicationCatalog, HospitalMedicationItem } from '@/app/actions/hospital-medications'
import { getAdmissionFinancialSummary, addAdmissionExpense, deleteAdmissionExpense } from '@/app/actions/hospital-expenses'

export default function InternmentRecordModal({ admission, onClose, onSuccess }: { admission: any, onClose: () => void, onSuccess: () => void }) {
    const [activeTab, setActiveTab] = useState<'medications' | 'observations'>('medications')
    const [loading, setLoading] = useState(false)
    const [medicationLogs, setMedicationLogs] = useState<any[]>([])
    const [activeMedications, setActiveMedications] = useState<any[]>([])
    const [catalogMeds, setCatalogMeds] = useState<HospitalMedicationItem[]>([])
    const [observations, setObservations] = useState<any[]>([])
    const [financialSummary, setFinancialSummary] = useState<any>(null)
    const [applyNotes, setApplyNotes] = useState<Record<string, string>>({})
    const [applyMls, setApplyMls] = useState<Record<string, string>>({})
    const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
    const [currentSeverity, setCurrentSeverity] = useState(admission.severity)

    // Form Itens Diversos
    const [expenseTitle, setExpenseTitle] = useState('')
    const [expenseAmount, setExpenseAmount] = useState('')
    const [addingExpense, setAddingExpense] = useState(false)

    const loadRecords = async () => {
        const [logs, obs, activeMeds, catalog, finSummary] = await Promise.all([
            getMedicationLogs(admission.id),
            getHospitalObservations(admission.id),
            getAdmissionMedications(admission.id),
            getHospitalMedicationCatalog(),
            getAdmissionFinancialSummary(admission.id)
        ])
        setMedicationLogs(logs)
        setObservations(obs)
        setActiveMedications(activeMeds)
        setCatalogMeds(catalog)
        setFinancialSummary(finSummary)
    }

    useEffect(() => {
        loadRecords()
    }, [])

    const handlePrescribe = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('admissionId', admission.id)
        formData.append('petId', admission.pet_id)

        const res = await prescreverMedicacao(formData)
        if (res.success) {
            e.currentTarget.reset()
            setTimeout(async () => {
                await loadRecords()
                onSuccess()
                setLoading(false)
                setShowPrescriptionForm(false)
            }, 500)
        } else {
            setLoading(false)
            alert(res.message)
        }
    }

    const handleApplyDose = async (medId: string) => {
        setLoading(true)
        const note = applyNotes[medId] || ''
        const ml = parseFloat(applyMls[medId] || '0')
        const res = await applyMedicationDose(medId, admission.id, note, ml)
        setLoading(false)
        if (res.success) {
            setApplyNotes(prev => ({ ...prev, [medId]: '' }))
            setApplyMls(prev => ({ ...prev, [medId]: '' }))
            setTimeout(() => {
                loadRecords()
                onSuccess()
            }, 400)
        } else {
            alert(res.message)
        }
    }

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!expenseTitle.trim()) return
        const amountNum = parseFloat(expenseAmount) || 0
        setAddingExpense(true)

        const res = await addAdmissionExpense(admission.id, expenseTitle, amountNum)
        setAddingExpense(false)
        if (res.success) {
            setExpenseTitle('')
            setExpenseAmount('')
            await loadRecords()
        } else {
            alert(res.message || 'Erro ao adicionar item')
        }
    }

    const handleDeleteExpense = async (expenseId: string) => {
        if (!confirm('Deseja remover este item do extrato?')) return
        const res = await deleteAdmissionExpense(expenseId)
        if (res.success) {
            await loadRecords()
        } else {
            alert(res.message || 'Erro ao excluir item')
        }
    }

    const handleAddObservation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('admissionId', admission.id)

        const res = await addHospitalObservation(formData)
        setLoading(false)
        if (res.success) {
            e.currentTarget.reset()
            loadRecords()
        } else {
            alert(res.message)
        }
    }

    const handleUpdateSeverity = async (newSeverity: string) => {
        setLoading(true)
        const res = await updateAdmissionSeverity(admission.id, newSeverity)
        setLoading(false)
        if (res.success) {
            setCurrentSeverity(newSeverity)
            onSuccess()
        }
    }

    return (
        <div className="flex items-center justify-center p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="card glass relative flex flex-col p-0" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', padding: 0, overflow: 'hidden', border: '1px solid rgba(0, 228, 206, 0.2)', fontFamily: 'var(--font-montserrat)' }}>
                {/* Header */}
                <div className="relative" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="absolute inset-0 bg-navy-dark/40 backdrop-blur-sm" />
                    <div className="flex justify-between items-center relative z-10" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(140, 180, 201, 0.1)' }}>
                        <div className="flex gap-4 items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-coral" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-montserrat)' }}>🩺 Prontuário Clínico</h2>
                                <p className="text-muted text-sm" style={{ margin: '4px 0 0 0', fontFamily: 'var(--font-montserrat)' }}>
                                    Paciente: <span className="text-sky font-bold">{admission.pets.name}</span> ({admission.pets.species === 'cat' ? 'Felino' : 'Canino'}) • Tutor: <span style={{ color: '#fff' }}>{admission.pets.customers?.name}</span>
                                </p>
                            </div>
                            <div style={{ marginLeft: '1rem', borderLeft: '1px solid rgba(140, 180, 201, 0.2)', paddingLeft: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-montserrat)' }}>Status Clínico Atual</label>
                                <select
                                    value={currentSeverity}
                                    onChange={(e) => handleUpdateSeverity(e.target.value)}
                                    className="input"
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        width: 'auto',
                                        color: currentSeverity === 'low' ? 'var(--status-done)' : currentSeverity === 'medium' ? 'var(--status-pending)' : currentSeverity === 'high' ? 'var(--status-in-progress)' : 'var(--status-canceled)',
                                        backgroundColor: 'rgba(27, 59, 90, 0.3)',
                                        fontFamily: 'var(--font-montserrat)'
                                    }}
                                >
                                    <option value="low">🟢 Estável / Baixa Gravidade</option>
                                    <option value="medium">🟡 Moderado / Observação</option>
                                    <option value="high">🟠 Grave / Atenção Constante</option>
                                    <option value="critical">🔴 Crítico / Risco Iminente</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-white transition-colors" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6" style={{ padding: '1rem 1.5rem 0 1.5rem', borderBottom: '1px solid rgba(140, 180, 201, 0.1)', backgroundColor: 'var(--bg-tertiary)' }}>
                    <button
                        className="font-bold text-sm"
                        style={{ paddingBottom: '1rem', position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)', color: activeTab === 'medications' ? 'var(--color-sky)' : 'var(--text-muted)' }}
                        onClick={() => setActiveTab('medications')}
                    >
                        💊 Medicações
                        {activeTab === 'medications' && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: 'var(--color-sky)', borderRadius: '4px 4px 0 0' }}></div>}
                    </button>
                    <button
                        className="font-bold text-sm"
                        style={{ paddingBottom: '1rem', position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)', color: activeTab === 'observations' ? 'var(--color-sky)' : 'var(--text-muted)' }}
                        onClick={() => setActiveTab('observations')}
                    >
                        📋 Evolução Clínica
                        {activeTab === 'observations' && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: 'var(--color-sky)', borderRadius: '4px 4px 0 0' }}></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-col" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'rgba(13, 27, 42, 0.4)' }}>
                    {activeTab === 'medications' && (
                        <div className="flex flex-col gap-6">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold" style={{ color: '#fff', margin: 0 }}>Prescrições Ativas</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{activeMedications.length} Item(s)</span>
                                </div>

                                {activeMedications.length === 0 ? (
                                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '12px', border: '2px dashed rgba(42, 86, 130, 0.5)', backgroundColor: 'rgba(27, 59, 90, 0.2)', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                                        <p style={{ fontWeight: 500 }}>Nenhuma prescrição ativa para este paciente.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        {activeMedications.map(m => (
                                            <div key={m.id} className="card glass p-0 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--color-sky)', padding: 0, overflow: 'hidden' }}>
                                                <div style={{ padding: '1.25rem' }}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <strong className="text-lg text-sky">{m.name}</strong>
                                                        <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>{m.frequency_hours}h / {m.frequency_hours}h</span>
                                                    </div>
                                                    <div className="flex flex-col gap-2 mb-4">
                                                        <p className="text-secondary text-sm" style={{ margin: 0 }}>Dosagem: <span style={{ color: '#fff', fontWeight: 600 }}>{m.dosage}</span></p>
                                                        {m.notes && <p className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', margin: 0, backgroundColor: 'rgba(27, 59, 90, 0.3)', padding: '8px', borderRadius: '4px' }}>"{m.notes}"</p>}
                                                    </div>

                                                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-sky-dark, #00e4ce)', marginBottom: '4px' }}>ML Gastos</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                className="input"
                                                                style={{ fontSize: '0.75rem', padding: '8px', fontFamily: 'var(--font-montserrat)', fontWeight: 700 }}
                                                                placeholder="Ex: 2.5 ml"
                                                                value={applyMls[m.id] || ''}
                                                                onChange={(e) => setApplyMls(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Observação da Dose</label>
                                                            <input
                                                                type="text"
                                                                className="input"
                                                                style={{ fontSize: '0.75rem', padding: '8px', fontFamily: 'var(--font-montserrat)' }}
                                                                placeholder="Como o pet reagiu?"
                                                                value={applyNotes[m.id] || ''}
                                                                onChange={(e) => setApplyNotes(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between" style={{ padding: '1rem 1.25rem', backgroundColor: 'rgba(22, 38, 56, 0.5)', borderTop: '1px solid rgba(0, 228, 206, 0.1)' }}>
                                                    <div className="flex flex-col">
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '-0.05em' }}>Próxima Dose</span>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: new Date(m.next_dose_at) <= new Date() ? 'var(--status-canceled)' : 'var(--status-done)' }}>
                                                            {new Date(m.next_dose_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        disabled={loading}
                                                        onClick={() => handleApplyDose(m.id)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                                                    >
                                                        💉 Aplicar Dose
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                                {!showPrescriptionForm ? (
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Prescrições Médicas</h3>
                                            <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Adicione novos medicamentos ou tratamentos</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPrescriptionForm(true)}
                                            className="btn btn-primary"
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>＋</span> Nova Prescrição
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-coral" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-montserrat)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(240, 140, 152, 0.2)', fontSize: '0.75rem', color: '#fff', fontFamily: 'var(--font-montserrat)' }}>＋</span>
                                                Nova Prescrição Médica
                                            </h3>
                                            <button
                                                onClick={() => setShowPrescriptionForm(false)}
                                                className="text-muted"
                                                style={{ fontSize: '0.75rem', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                        <form onSubmit={handlePrescribe} className="flex flex-col gap-4">
                                            <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                                                <div style={{ flex: 2, minWidth: '200px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Medicamento (Catálogo ou Digitar)</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        list="hospital-catalog-meds"
                                                        required
                                                        className="input"
                                                        placeholder="Selecione ou digite (Ex: Dipirona, Baytril)..."
                                                        style={{ fontFamily: 'var(--font-montserrat)' }}
                                                    />
                                                    <datalist id="hospital-catalog-meds">
                                                        {catalogMeds.map(item => (
                                                            <option key={item.id} value={item.name}>
                                                                {item.name} ({item.volume_ml} ml)
                                                            </option>
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Dose e Via</label>
                                                    <input type="text" name="dosage" required className="input" placeholder="Ex: 5 gotas VO" style={{ fontFamily: 'var(--font-montserrat)' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: '100px' }}>
                                                    <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Intervalo (h)</label>
                                                    <input type="number" name="frequencyHours" required min="1" className="input" placeholder="Ex: 8" style={{ fontFamily: 'var(--font-montserrat)' }} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label text-sm" style={{ fontFamily: 'var(--font-montserrat)' }}>Recomendações e Observações Livres</label>
                                                <textarea name="notes" className="input" style={{ resize: 'none', padding: '12px', fontFamily: 'var(--font-montserrat)' }} rows={2} placeholder="Descreva aqui orientações ou observações adicionais para este medicamento..."></textarea>
                                            </div>
                                            <div className="flex justify-center mt-2" style={{ justifyContent: 'flex-end' }}>
                                                <button type="submit" disabled={loading} className="btn btn-primary text-sm" style={{ padding: '12px 32px', fontFamily: 'var(--font-montserrat)' }}>
                                                    {loading ? '...' : 'Salvar Prescrição'}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </section>

                            <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0, 228, 206, 0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-sky-dark, #00e4ce)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-montserrat)' }}>
                                            💰 Extrato Financeiro & Subtotal Parcial
                                        </h3>
                                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                                            Resumo em tempo real de Diárias, Medicações e Itens Diversos.
                                        </p>
                                    </div>
                                    {financialSummary && (
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Subtotal Parcial</span>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-montserrat)' }}>
                                                R$ {(financialSummary.grandTotal || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {financialSummary && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                        {/* Linha 1: Diárias */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                            <span>🛌 <strong>Diárias de Internamento:</strong> {financialSummary.numDiarias}x ({financialSummary.serviceName} a R$ {financialSummary.dailyRate.toFixed(2)})</span>
                                            <strong style={{ color: 'var(--text-primary)' }}>R$ {financialSummary.diariasTotal.toFixed(2)}</strong>
                                        </div>

                                        {/* Linha 2: Medicações Aplicadas */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                            <span>💊 <strong>Medicações Aplicadas:</strong> {financialSummary.medLogsSummary?.length || 0} dose(s) registrada(s)</span>
                                            <strong style={{ color: 'var(--text-primary)' }}>R$ {financialSummary.medTotal.toFixed(2)}</strong>
                                        </div>

                                        {/* Linha 3: Itens Diversos */}
                                        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span>🛒 <strong>Itens Diversos / Outros Custos (sem cadastro):</strong></span>
                                                <strong style={{ color: 'var(--text-primary)' }}>R$ {financialSummary.expensesTotal.toFixed(2)}</strong>
                                            </div>

                                            {/* Lista de itens diversos lançados */}
                                            {financialSummary.expensesList && financialSummary.expensesList.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                                    {financialSummary.expensesList.map((item: any) => (
                                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                            <span>• {item.title}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <strong>R$ {item.amount.toFixed(2)}</strong>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteExpense(item.id)}
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                                                    title="Remover item do extrato"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Form para Adicionar Item Diversos */}
                                            <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Soro Fisiológico 500ml, Atadura..."
                                                    className="input"
                                                    value={expenseTitle}
                                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                                    style={{ flex: 2, minWidth: '180px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                                    required
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Valor R$ (ex: 10,00)"
                                                    className="input"
                                                    value={expenseAmount}
                                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                                    style={{ flex: 1, minWidth: '110px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                                    required
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={addingExpense}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700 }}
                                                >
                                                    {addingExpense ? '...' : '＋ Adicionar'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold" style={{ color: '#fff', margin: 0 }}>Histórico de Aplicações</h3>
                                    <button
                                        onClick={loadRecords}
                                        style={{ fontSize: '0.65rem', color: 'var(--color-sky)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', backgroundColor: 'rgba(27, 59, 90, 0.3)', padding: '4px 12px', borderRadius: '16px', border: '1px solid rgba(0, 228, 206, 0.2)', cursor: 'pointer' }}
                                    >
                                        🔄 Atualizar
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {medicationLogs.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: '0.875rem', fontStyle: 'italic', padding: '2.5rem', textAlign: 'center', border: '2px dashed rgba(42, 86, 130, 0.5)', borderRadius: '12px' }}>Nenhum registro de aplicação encontrado.</p>
                                    ) : (
                                        medicationLogs.map(log => (
                                            <div key={log.id} className="flex flex-col gap-2" style={{ padding: '1rem', backgroundColor: 'rgba(30, 52, 75, 0.4)', borderRadius: '12px', border: '1px solid transparent', transition: 'all 0.2s' }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sky font-bold" style={{ fontFamily: 'var(--font-montserrat)', fontSize: '0.75rem' }}>{new Date(log.applied_at).toLocaleString('pt-BR')}</span>
                                                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-montserrat)' }}>{log.hospital_medications?.name}</span>
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-montserrat)' }}>({log.hospital_medications?.dosage})</span>
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-montserrat)' }}>
                                                        por {log.profiles?.full_name || 'Usuário'}
                                                    </div>
                                                </div>
                                                {log.notes && (
                                                    <div className="text-secondary" style={{ marginTop: '4px', padding: '8px', backgroundColor: 'rgba(18, 40, 64, 0.4)', borderRadius: '4px', fontSize: '0.75rem', borderLeft: '2px solid var(--color-coral)', fontStyle: 'italic', fontFamily: 'var(--font-montserrat)' }}>
                                                        "{log.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'observations' && (
                        <div className="flex flex-col gap-6" style={{ height: '100%' }}>
                            <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                                <label className="text-coral font-bold text-sm" style={{ display: 'block', marginBottom: '1rem', fontFamily: 'var(--font-montserrat)' }}>Evolução Clínica / Notas de Observação</label>
                                <form onSubmit={handleAddObservation} className="flex flex-col gap-4">
                                    <textarea
                                        name="observation"
                                        required
                                        rows={4}
                                        className="input text-sm"
                                        style={{ resize: 'none', backgroundColor: 'rgba(27, 59, 90, 0.4)', fontFamily: 'var(--font-montserrat)' }}
                                        placeholder="Descreva o estado atual do paciente, apetite, comportamento..."
                                    />
                                    <div className="flex" style={{ justifyContent: 'flex-end' }}>
                                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 32px', fontFamily: 'var(--font-montserrat)' }}>
                                            {loading ? 'Salvando...' : 'Registrar Evolução'}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <section style={{ flex: 1 }}>
                                <h3 className="text-lg font-bold mb-6" style={{ color: '#fff', fontFamily: 'var(--font-montserrat)' }}>Linha do Tempo de Evolução</h3>
                                <div className="flex flex-col gap-6" style={{ position: 'relative', paddingLeft: '2rem', marginLeft: '1rem', fontFamily: 'var(--font-montserrat)' }}>
                                    <div style={{ position: 'absolute', left: 0, top: '8px', width: '2px', height: 'calc(100% - 16px)', background: 'linear-gradient(180deg, var(--color-sky) 0%, rgba(42, 86, 130, 0.5) 100%)' }}></div>

                                    {observations.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: '0.875rem', fontStyle: 'italic', marginLeft: '-2rem', textAlign: 'center', padding: '2.5rem' }}>Inicie o acompanhamento clínico registrando a primeira evolução acima.</p>
                                    ) : (
                                        observations.map(obs => (
                                            <div key={obs.id} style={{ position: 'relative' }}>
                                                {/* Timeline Node */}
                                                <div style={{ position: 'absolute', left: '-2.5rem', top: '0.25rem', width: '1rem', height: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-navy)', border: '3px solid var(--color-sky)', zIndex: 10 }}></div>

                                                <div className="glass" style={{ padding: '1.25rem', borderRadius: '16px', transition: 'all 0.3s ease' }}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0, 228, 206, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky)', fontWeight: 700, fontSize: '0.75rem' }}>
                                                                {obs.profiles?.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 700 }}>{obs.profiles?.full_name || 'Usuário'}</span>
                                                        </div>
                                                        <span className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'var(--color-navy-dark)', padding: '4px 12px', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>
                                                            {new Date(obs.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-secondary text-sm" style={{ margin: 0, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{obs.observation}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
