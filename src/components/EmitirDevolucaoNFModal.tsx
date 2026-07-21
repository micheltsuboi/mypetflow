'use client'

import { useState, useMemo } from 'react'
import { NotaFiscal } from '@/types/database'

interface ItemDevolucao {
    id: string
    descricao: string
    quantidade: number
    valor_unitario: number
    ncm: string
    cfop: string
    cst: string
    unidade: string
}

interface EmitirDevolucaoNFModalProps {
    initialNota?: NotaFiscal | null
    notasAutorizadas?: NotaFiscal[]
    onClose: () => void
    onSuccess: () => void
}

export default function EmitirDevolucaoNFModal({
    initialNota,
    notasAutorizadas = [],
    onClose,
    onSuccess
}: EmitirDevolucaoNFModalProps) {
    const [selectedNotaId, setSelectedNotaId] = useState<string>(initialNota?.id || '')
    
    // Form States
    const [chaveReferenciada, setChaveReferenciada] = useState<string>(
        initialNota?.chave_nf || (initialNota?.retorno_focus as any)?.chave_nfe || (initialNota?.retorno_focus as any)?.chave_nf || ''
    )
    const [tipoOperacao, setTipoOperacao] = useState<0 | 1>(0) // 0 = Entrada, 1 = Saída
    const [naturezaOperacao, setNaturezaOperacao] = useState<string>('DEVOLUCAO DE VENDA DE MERCADORIA')
    const [cfop, setCfop] = useState<string>('1202')
    const [justificativa, setJustificativa] = useState<string>('')

    // Destinatário / Tutor
    const [tutorNome, setTutorNome] = useState<string>(initialNota?.tomador_nome || 'CONSUMIDOR FINAL')
    const [tutorCpf, setTutorCpf] = useState<string>(initialNota?.tomador_cpf_cnpj || '')

    // Itens
    const [items, setItems] = useState<ItemDevolucao[]>(() => {
        if (initialNota?.valor_total) {
            return [{
                id: '1',
                descricao: `Devolução Ref. Nota ${initialNota.numero_nf || initialNota.referencia}`,
                quantidade: 1,
                valor_unitario: Number(initialNota.valor_total) || 0,
                ncm: '00000000',
                cfop: '1202',
                cst: '102',
                unidade: 'un'
            }]
        }
        return [{
            id: '1',
            descricao: 'Produto devolvido',
            quantidade: 1,
            valor_unitario: 0,
            ncm: '00000000',
            cfop: '1202',
            cst: '102',
            unidade: 'un'
        }]
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Handler para quando seleciona uma nota autorizada do dropdown
    const handleSelectNota = (notaId: string) => {
        setSelectedNotaId(notaId)
        if (!notaId) return

        const nota = notasAutorizadas.find(n => n.id === notaId)
        if (nota) {
            const chave = nota.chave_nf || (nota.retorno_focus as any)?.chave_nfe || (nota.retorno_focus as any)?.chave_nf || ''
            setChaveReferenciada(chave)
            if (nota.tomador_nome) setTutorNome(nota.tomador_nome)
            if (nota.tomador_cpf_cnpj) setTutorCpf(nota.tomador_cpf_cnpj)
            
            const total = Number(nota.valor_total) || 0
            setItems([{
                id: '1',
                descricao: `Devolução Ref. Nota ${nota.numero_nf || nota.referencia}`,
                quantidade: 1,
                valor_unitario: total,
                ncm: '00000000',
                cfop: tipoOperacao === 0 ? '1202' : '5202',
                cst: '102',
                unidade: 'un'
            }])
        }
    }

    // Handler para troca de Tipo de Operação (0 = Entrada / 1 = Saída)
    const handleTipoOperacaoChange = (novoTipo: 0 | 1) => {
        setTipoOperacao(novoTipo)
        if (novoTipo === 0) {
            setNaturezaOperacao('DEVOLUCAO DE VENDA DE MERCADORIA')
            setCfop('1202')
            setItems(prev => prev.map(item => ({ ...item, cfop: '1202' })))
        } else {
            setNaturezaOperacao('DEVOLUCAO DE COMPRA PARA GIRO')
            setCfop('5202')
            setItems(prev => prev.map(item => ({ ...item, cfop: '5202' })))
        }
    }

    // Cálculo do valor total da nota de devolução
    const totalAmount = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0)
    }, [items])

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: (prev.length + 1).toString(),
                descricao: 'Novo produto devolvido',
                quantidade: 1,
                valor_unitario: 0,
                ncm: '00000000',
                cfop: cfop,
                cst: '102',
                unidade: 'un'
            }
        ])
    }

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof ItemDevolucao, value: any) => {
        setItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    const handleEmitirDevolucao = async () => {
        setError(null)
        const cleanChave = chaveReferenciada.replace(/\D/g, '')

        if (!cleanChave || cleanChave.length !== 44) {
            setError('A Chave de Acesso referenciada deve conter exatamente 44 dígitos numéricos.')
            return
        }

        if (totalAmount <= 0) {
            setError('O valor total da devolução deve ser maior que R$ 0,00.')
            return
        }

        setLoading(true)
        try {
            const body = {
                chave_referenciada: cleanChave,
                tipo_operacao: tipoOperacao,
                natureza_operacao: naturezaOperacao,
                refId: selectedNotaId || undefined,
                tutor: {
                    nome: tutorNome || 'CONSUMIDOR FINAL',
                    cpf: tutorCpf || undefined
                },
                produtos: items.map(i => ({
                    ...i,
                    cfop: i.cfop || cfop
                })),
                total_amount: totalAmount,
                justificativa
            }

            const response = await fetch('/api/nf/devolucao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error + (data.details ? `: ${data.details}` : ''))
            } else {
                alert('✅ Nota Fiscal de Devolução enviada com sucesso!')
                onSuccess()
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão ao emitir devolução.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px',
                width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                border: '1px solid var(--card-border)',
                fontFamily: 'var(--font-montserrat), sans-serif',
                color: 'var(--text-primary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🔄 Emitir Nota Fiscal de Devolução (NFe)
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Seleção de Nota Origem */}
                    {notasAutorizadas.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                                Selecionar Nota de Origem do Sistema (Opcional):
                            </label>
                            <select
                                value={selectedNotaId}
                                onChange={(e) => handleSelectNota(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.6rem', borderRadius: '6px',
                                    border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)', fontSize: '0.9rem'
                                }}
                            >
                                <option value="">-- Inserir Chave Manualmente --</option>
                                {notasAutorizadas.map(n => (
                                    <option key={n.id} value={n.id}>
                                        NF #{n.numero_nf || n.referencia} - {n.tomador_nome || 'Consumidor'} - R$ {Number(n.valor_total).toFixed(2)} ({new Date(n.created_at).toLocaleDateString('pt-BR')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Chave de Acesso Referenciada */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                            Chave de Acesso Referenciada (44 dígitos) *
                        </label>
                        <input
                            type="text"
                            maxLength={44}
                            placeholder="Ex: 35240700000000000000550010000000011000000000"
                            value={chaveReferenciada}
                            onChange={(e) => setChaveReferenciada(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem', borderRadius: '6px',
                                border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.9rem'
                            }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Chave de acesso da NFe ou NFCe original a ser devolvida.
                        </span>
                    </div>

                    {/* Tipo de Operação */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                Tipo de Operação *
                            </label>
                            <select
                                value={tipoOperacao}
                                onChange={(e) => handleTipoOperacaoChange(Number(e.target.value) as 0 | 1)}
                                style={{
                                    width: '100%', padding: '0.6rem', borderRadius: '6px',
                                    border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)', fontSize: '0.9rem'
                                }}
                            >
                                <option value={0}>📥 Entrada (Devolução de Cliente)</option>
                                <option value={1}>📤 Saída (Devolução para Fornecedor)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                                CFOP Padrão
                            </label>
                            <input
                                type="text"
                                value={cfop}
                                onChange={(e) => setCfop(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.6rem', borderRadius: '6px',
                                    border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)', fontSize: '0.9rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Natureza da Operação */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
                            Natureza da Operação *
                        </label>
                        <input
                            type="text"
                            value={naturezaOperacao}
                            onChange={(e) => setNaturezaOperacao(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem', borderRadius: '6px',
                                border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)', fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {/* Dados do Destinatário / Tutor */}
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            👤 Dados do {tipoOperacao === 0 ? 'Cliente / Tutor' : 'Fornecedor'}
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Nome / Razão Social"
                                value={tutorNome}
                                onChange={(e) => setTutorNome(e.target.value)}
                                style={{
                                    padding: '0.5rem', borderRadius: '6px',
                                    border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', fontSize: '0.85rem'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="CPF / CNPJ"
                                value={tutorCpf}
                                onChange={(e) => setTutorCpf(e.target.value)}
                                style={{
                                    padding: '0.5rem', borderRadius: '6px',
                                    border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Itens Devolvidos */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                📦 Produtos a Devolver ({items.length})
                            </label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                style={{
                                    background: 'var(--primary)', color: 'white', border: 'none',
                                    padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                            >
                                + Adicionar Item
                            </button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} style={{
                                background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px',
                                border: '1px solid var(--card-border)', marginBottom: '0.5rem',
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center'
                            }}>
                                <input
                                    type="text"
                                    placeholder="Descrição do produto"
                                    value={item.descricao}
                                    onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                                    style={{
                                        padding: '0.4rem', borderRadius: '4px',
                                        border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)', fontSize: '0.8rem'
                                    }}
                                />
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Qtd"
                                    value={item.quantidade}
                                    onChange={(e) => handleItemChange(idx, 'quantidade', Number(e.target.value))}
                                    style={{
                                        padding: '0.4rem', borderRadius: '4px',
                                        border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)', fontSize: '0.8rem'
                                    }}
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Val. Unit (R$)"
                                    value={item.valor_unitario}
                                    onChange={(e) => handleItemChange(idx, 'valor_unitario', Number(e.target.value))}
                                    style={{
                                        padding: '0.4rem', borderRadius: '4px',
                                        border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)', fontSize: '0.8rem'
                                    }}
                                />
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        style={{
                                            background: '#ef4444', color: 'white', border: 'none',
                                            borderRadius: '4px', padding: '0.4rem', cursor: 'pointer', fontSize: '0.8rem'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Resumo do Valor Total */}
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Valor Total da Devolução:</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                        </span>
                    </div>

                    {/* Justificativa Opcional */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                            Motivo / Justificativa (Opcional):
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Produto com defeito de fábrica / Erro no pedido"
                            value={justificativa}
                            onChange={(e) => setJustificativa(e.target.value)}
                            style={{
                                width: '100%', padding: '0.5rem', borderRadius: '6px',
                                border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)', fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)',
                            padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '6px',
                                border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleEmitirDevolucao}
                            disabled={loading}
                            style={{
                                flex: 2, padding: '0.75rem', borderRadius: '6px',
                                border: 'none', background: 'var(--primary)',
                                color: 'white', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                            }}
                        >
                            {loading ? '⏳ Processando Emissão...' : '🚀 Transmitir NFe de Devolução'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
