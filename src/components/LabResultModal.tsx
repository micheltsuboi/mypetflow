'use client'

import { useState, useEffect } from 'react'
import { getLabReportData, saveLabResults } from '@/app/actions/lab-actions'

interface LabResultModalProps {
    requestId: string
    readOnly?: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function LabResultModal({ requestId, readOnly = false, onClose, onSuccess }: LabResultModalProps) {
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [resultsMap, setResultsMap] = useState<Record<string, string>>({})
    const [conclusion, setConclusion] = useState('')
    const [isPrintMode, setIsPrintMode] = useState(readOnly)

    const loadData = async () => {
        setLoading(true)
        const data = await getLabReportData(requestId)
        if (data) {
            setReportData(data)
            setConclusion(data.request.conclusion || '')
            const map: Record<string, string> = {}
            data.parametersWithResults.forEach((p: any) => {
                map[p.id] = p.observedValue || ''
            })
            setResultsMap(map)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [requestId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await saveLabResults(requestId, resultsMap, conclusion)
        setSaving(false)
        if (res.success) {
            alert('Laudo salvo com sucesso!')
            onSuccess()
            setIsPrintMode(true)
        } else {
            alert(res.message || 'Erro ao salvar laudo')
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card glass p-8 text-center" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>⏳</span>
                    <p style={{ fontWeight: 600 }}>Carregando dados do exame e parâmetros...</p>
                </div>
            </div>
        )
    }

    if (!reportData) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card glass p-8 text-center" style={{ color: 'var(--text-primary)' }}>
                    <p>Não foi possível carregar as informações do laudo.</p>
                    <button onClick={onClose} className="btn btn-secondary mt-4">Fechar</button>
                </div>
            </div>
        )
    }

    const { org, pet, tutor, vet, exam, parametersWithResults, request } = reportData

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', overflowY: 'auto'
        }}>
            {/* CSS de Impressão de Laudo */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-lab-report, #printable-lab-report * {
                        visibility: visible;
                    }
                    #printable-lab-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: #fff !important;
                        color: #000 !important;
                        padding: 20px !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="card glass relative" style={{
                width: '100%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto',
                border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '2rem'
            }}>
                {/* Botões de Ação Superiores */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!readOnly && (
                            <button
                                onClick={() => setIsPrintMode(false)}
                                className={`btn ${!isPrintMode ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: '0.85rem' }}
                            >
                                ✏️ Editar Resultados
                            </button>
                        )}
                        <button
                            onClick={() => setIsPrintMode(true)}
                            className={`btn ${isPrintMode ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.85rem' }}
                        >
                            📄 Visualizar / Imprimir Laudo
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {isPrintMode && (
                            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                                🖨️ Imprimir / Gerar PDF
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.75rem', cursor: 'pointer', lineHeight: 1 }}>
                            ×
                        </button>
                    </div>
                </div>

                {/* MODAL MODO EDICÃO / DIGITAÇÃO DE RESULTADOS */}
                {!isPrintMode && !readOnly ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--color-sky-dark, #00e4ce)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🔬 Digitação de Laudo: {exam?.name}
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Paciente: <strong>{pet?.name}</strong> ({pet?.species === 'cat' ? 'Gato' : 'Cão'}, {pet?.ageText}) | Tutor: <strong>{tutor?.name || 'Não informado'}</strong>
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Parâmetros Medidos e Faixa de Referência para {pet?.ageText}:
                            </span>

                            {parametersWithResults.map((p: any) => (
                                <div key={p.id} style={{
                                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: '1rem', alignItems: 'center',
                                    background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px',
                                    border: '1px solid var(--card-border)'
                                }}>
                                    <div>
                                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{p.name}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unidade: {p.unit || 'S/U'}</span>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Resultado..."
                                            className="input"
                                            value={resultsMap[p.id] || ''}
                                            onChange={(e) => setResultsMap({ ...resultsMap, [p.id]: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}
                                        />
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>Ref. ({pet?.ageText}):</span>
                                        <strong>{p.referenceText}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                Parecer Técnico / Conclusão do Laudo (Opcional)
                            </label>
                            <textarea
                                className="input"
                                rows={3}
                                placeholder="Insira considerações técnicas ou observações da amostra..."
                                value={conclusion}
                                onChange={(e) => setConclusion(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem', resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }}>
                                {saving ? 'Salvando...' : '💾 Salvar e Concluir Laudo'}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* MODAL MODO VISUALIZAÇÃO / LAUDO PARA IMPRESSÃO (PDF) */
                    <div id="printable-lab-report" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', color: 'var(--text-primary)' }}>
                        {/* Cabeçalho da Clínica */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-coral)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-coral)' }}>
                                    {org?.name || 'Clínica Veterinária & Laboratório'}
                                </h1>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                                    Laudo Laboratorial Veterinário de Diagnóstico
                                </p>
                            </div>
                            {org?.logo_url && (
                                <img src={org.logo_url} alt="Logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />
                            )}
                        </div>

                        {/* Bloco de Dados do Paciente e Tutor */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                            background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px',
                            marginBottom: '1.5rem', border: '1px solid var(--card-border)', fontSize: '0.85rem'
                        }}>
                            <div>
                                <p style={{ margin: '0 0 0.3rem 0' }}>🐾 <strong>Paciente:</strong> {pet?.name || 'N/I'}</p>
                                <p style={{ margin: '0 0 0.3rem 0' }}>🧬 <strong>Espécie/Raça:</strong> {pet?.species === 'cat' ? 'Felina' : 'Canina'} | {pet?.breed || 'S.R.D.'}</p>
                                <p style={{ margin: '0 0 0.3rem 0' }}>🎂 <strong>Idade / Categoria:</strong> {pet?.ageText || 'N/I'}</p>
                                <p style={{ margin: 0 }}>📋 <strong>Nº Ficha:</strong> {pet?.physical_file_number || pet?.id?.substring(0, 8)}</p>
                            </div>
                            <div>
                                <p style={{ margin: '0 0 0.3rem 0' }}>👤 <strong>Tutor:</strong> {tutor?.name || 'Não informado'}</p>
                                <p style={{ margin: '0 0 0.3rem 0' }}>👨‍⚕️ <strong>Vet Solicitante:</strong> {vet?.name || 'Clínica Veterinária'} {vet?.crmv ? `(CRMV: ${vet.crmv})` : ''}</p>
                                <p style={{ margin: '0 0 0.3rem 0' }}>📅 <strong>Data da Solicitacao:</strong> {new Date(request.requested_at).toLocaleDateString('pt-BR')}</p>
                                <p style={{ margin: 0 }}>✅ <strong>Data do Laudo:</strong> {request.completed_at ? new Date(request.completed_at).toLocaleDateString('pt-BR') : 'Em andamento'}</p>
                            </div>
                        </div>

                        {/* Título do Exame */}
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: 'var(--color-sky-dark, #00e4ce)', letterSpacing: '0.05em' }}>
                                EXAME: {exam?.name}
                            </h2>
                            {exam?.category && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    Setor: {exam.category}
                                </span>
                            )}
                        </div>

                        {/* Tabela de Resultados Laboratoriais */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Parâmetro / Analito</th>
                                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Resultado Obserado</th>
                                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Unidade</th>
                                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>Valores de Referência ({pet?.ageText})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parametersWithResults.map((p: any, idx: number) => (
                                    <tr key={p.id} style={{
                                        borderBottom: '1px solid var(--card-border)',
                                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                                    }}>
                                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {p.name}
                                        </td>
                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                                            <span style={{
                                                color: p.isAbnormal ? '#ef4444' : 'var(--text-primary)',
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                            }}>
                                                {p.observedValue || '-'}
                                                {p.isAbnormal && (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                                        {p.abnormalType === 'high' ? '▲ ALTO' : '▼ BAIXO'}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {p.unit || '-'}
                                        </td>
                                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {p.referenceText}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Conclusão / Parecer Técnico */}
                        {conclusion && (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--color-coral)', marginBottom: '2rem' }}>
                                <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-coral)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                    📝 Parecer Técnico / Conclusão:
                                </strong>
                                <p style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                                    {conclusion}
                                </p>
                            </div>
                        )}

                        {/* Rodapé e Assinatura */}
                        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px dashed var(--card-border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Emissão: {new Date().toLocaleString('pt-BR')} | MyPet Flow Lab
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '220px' }}>
                                <div style={{ borderBottom: '1px solid var(--text-primary)', marginBottom: '0.4rem', height: '30px' }}></div>
                                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}>
                                    {vet?.name || 'Responsável Técnico'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {vet?.crmv ? `CRMV: ${vet.crmv}` : 'Médico Veterinário'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
