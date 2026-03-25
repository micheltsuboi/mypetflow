'use client'

import { useState } from 'react'
import { NotaFiscalTipo, NotaFiscalOrigem } from '@/types/database'

interface EmitirNFModalProps {
    tipo: NotaFiscalTipo
    origemTipo: NotaFiscalOrigem
    refId: string
    total_amount: number
    tutor?: {
        nome: string
        cpf?: string
        email?: string
        endereco?: any
    }
    servico?: {
        descricao: string
        valor: number
        codigo?: string
    }
    produtos?: any[]
    onClose: () => void
    onSuccess: (status: string) => void
}

export default function EmitirNFModal({ 
    tipo, 
    origemTipo, 
    refId, 
    total_amount, 
    tutor, 
    servico, 
    produtos, 
    onClose, 
    onSuccess 
}: EmitirNFModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleEmitir = async () => {
        setLoading(true)
        setError(null)
        
        try {
            const body = {
                tipo,
                origemTipo,
                refId,
                total_amount,
                tutor,
                servico,
                produtos
            }

            const response = await fetch('/api/nf/emitir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error + (data.details ? ` - ${data.details}` : ''))
            } else {
                onSuccess(data.status)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const title = tipo === 'nfse' ? 'Emitir Nota Fiscal de Serviço (NFSe)' : 'Emitir Nota Fiscal Eletrônica (NFe)'

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                background: '#1a2235', padding: '2rem', borderRadius: '12px',
                width: '100%', maxWidth: '500px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#fff' }}>{title}</h2>
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#ccc' }}>
                    <p><strong>Tutor/Cliente:</strong> {tutor?.nome || 'Consumidor Final'}</p>
                    <p><strong>CPF/CNPJ:</strong> {tutor?.cpf || '-'}</p>
                    <p><strong>Valor Total:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total_amount)}</p>
                    
                    {tipo === 'nfse' && servico && (
                        <p style={{ marginTop: '0.5rem' }}><strong>Serviço:</strong> {servico.descricao}</p>
                    )}
                    
                    {tipo === 'nfe' && produtos && (
                        <p style={{ marginTop: '0.5rem' }}><strong>Itens:</strong> {produtos.length} produto(s)</p>
                    )}
                </div>

                {error && (
                    <div style={{ color: '#e74c3c', background: 'rgba(231, 76, 60, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        style={{
                            background: 'transparent', color: '#ccc', border: '1px solid #444', 
                            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleEmitir} 
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8A66 100%)', 
                            color: '#fff', border: 'none', padding: '0.75rem 1.5rem', 
                            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Emitindo...' : 'Confirmar Emissão'}
                    </button>
                </div>
            </div>
        </div>
    )
}
