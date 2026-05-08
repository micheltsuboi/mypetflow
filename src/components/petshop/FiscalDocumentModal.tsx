'use client'

import { useState } from 'react'
import { FileText, Receipt, X, CheckCircle2 } from 'lucide-react'

export type FiscalDocumentType = 'nfe' | 'nfce' | 'none'

interface FiscalDocumentModalProps {
    totalAmount: number
    onSelect: (type: FiscalDocumentType) => void
    onClose: () => void
}

export default function FiscalDocumentModal({ totalAmount, onSelect, onClose }: FiscalDocumentModalProps) {
    const [selected, setSelected] = useState<FiscalDocumentType | null>(null)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    const handleConfirm = () => {
        if (selected) onSelect(selected)
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                padding: '2rem',
                fontFamily: 'var(--font-montserrat), sans-serif',
                color: 'var(--text-primary)',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
            }}>
                {/* Botão Fechar */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1.25rem', right: '1.25rem',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', padding: '0.25rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', transition: 'all 0.2s'
                    }}
                >
                    <X size={20} />
                </button>

                {/* Ícone e Título */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                    }}>
                        <CheckCircle2 size={32} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                        Venda Finalizada! 🎉
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Total: <strong style={{ color: '#10B981', fontSize: '1.1rem' }}>{formatCurrency(totalAmount)}</strong>
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Deseja emitir algum documento fiscal?
                    </p>
                </div>

                {/* Cards de Seleção */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* NF-e */}
                    <button
                        onClick={() => setSelected('nfe')}
                        style={{
                            flex: 1, padding: '1.25rem 1rem', borderRadius: '14px', cursor: 'pointer',
                            border: selected === 'nfe' ? '2px solid #6366F1' : '2px solid var(--card-border)',
                            background: selected === 'nfe'
                                ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.1) 100%)'
                                : 'var(--bg-tertiary)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                            transition: 'all 0.25s ease',
                            transform: selected === 'nfe' ? 'translateY(-3px)' : 'none',
                            boxShadow: selected === 'nfe' ? '0 8px 20px rgba(99,102,241,0.25)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '12px',
                            background: selected === 'nfe'
                                ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                : 'rgba(99,102,241,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease'
                        }}>
                            <FileText size={26} color={selected === 'nfe' ? '#fff' : '#6366F1'} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontWeight: 700, fontSize: '1rem',
                                color: selected === 'nfe' ? '#6366F1' : 'var(--text-primary)'
                            }}>
                                NF-e
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Nota Fiscal Eletrônica
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                                Para pessoas jurídicas ou quando cliente solicita CNPJ/CPF na nota
                            </div>
                        </div>
                        {selected === 'nfe' && (
                            <div style={{
                                background: '#6366F1', color: '#fff', borderRadius: '20px',
                                fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                                letterSpacing: '0.5px'
                            }}>
                                SELECIONADO
                            </div>
                        )}
                    </button>

                    {/* NFC-e / Cupom Fiscal */}
                    <button
                        onClick={() => setSelected('nfce')}
                        style={{
                            flex: 1, padding: '1.25rem 1rem', borderRadius: '14px', cursor: 'pointer',
                            border: selected === 'nfce' ? '2px solid #F59E0B' : '2px solid var(--card-border)',
                            background: selected === 'nfce'
                                ? 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.1) 100%)'
                                : 'var(--bg-tertiary)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                            transition: 'all 0.25s ease',
                            transform: selected === 'nfce' ? 'translateY(-3px)' : 'none',
                            boxShadow: selected === 'nfce' ? '0 8px 20px rgba(245,158,11,0.25)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '12px',
                            background: selected === 'nfce'
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'rgba(245,158,11,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease'
                        }}>
                            <Receipt size={26} color={selected === 'nfce' ? '#fff' : '#F59E0B'} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontWeight: 700, fontSize: '1rem',
                                color: selected === 'nfce' ? '#D97706' : 'var(--text-primary)'
                            }}>
                                NFC-e
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Cupom Fiscal Eletrônico
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                                Para vendas ao consumidor final (balcão) sem CPF/CNPJ obrigatório
                            </div>
                        </div>
                        {selected === 'nfce' && (
                            <div style={{
                                background: '#F59E0B', color: '#fff', borderRadius: '20px',
                                fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                                letterSpacing: '0.5px'
                            }}>
                                SELECIONADO
                            </div>
                        )}
                    </button>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={handleConfirm}
                        disabled={!selected}
                        style={{
                            width: '100%', padding: '0.9rem',
                            background: selected
                                ? selected === 'nfe'
                                    ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'var(--bg-tertiary)',
                            color: selected ? '#fff' : 'var(--text-secondary)',
                            border: 'none', borderRadius: '12px',
                            fontWeight: 700, fontSize: '1rem',
                            cursor: selected ? 'pointer' : 'not-allowed',
                            transition: 'all 0.25s ease',
                            boxShadow: selected ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {selected === 'nfe' && '📄 Emitir Nota Fiscal (NF-e)'}
                        {selected === 'nfce' && '🧾 Emitir Cupom Fiscal (NFC-e)'}
                        {!selected && 'Selecione um documento acima'}
                    </button>

                    <button
                        onClick={() => onSelect('none')}
                        style={{
                            width: '100%', padding: '0.75rem',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px dashed var(--card-border)',
                            borderRadius: '12px', fontWeight: 500, fontSize: '0.9rem',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Não emitir documento fiscal agora
                    </button>
                </div>
            </div>
        </div>
    )
}
