'use client'

import { useState, useEffect } from 'react'
import { NotaFiscal } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface Props {
    notas: NotaFiscal[]
    orgId: string
}

export default function NotaFiscalList({ notas: initialNotas, orgId }: Props) {
    const [notas, setNotas] = useState<NotaFiscal[]>(initialNotas)
    const [selectedError, setSelectedError] = useState<string | null>(null)
    const [isCancelling, setIsCancelling] = useState<string | null>(null) // ID da nota sendo cancelada
    const [justificativa, setJustificativa] = useState('')

    // Efeito para manter o estado local sincronizado com as props iniciais (ex: após re-emissão)
    useEffect(() => {
        setNotas(initialNotas)
    }, [initialNotas])

    // Efeito para Realtime (Atualização Automática)
    useEffect(() => {
        const supabase = createClient()
        
        const channel = supabase
            .channel(`public:notas_fiscais:org:${orgId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notas_fiscais',
                    filter: `org_id=eq.${orgId}`
                },
                (payload) => {
                    console.log('Realtime update received:', payload)
                    if (payload.eventType === 'INSERT') {
                        setNotas(current => [payload.new as NotaFiscal, ...current])
                    } else if (payload.eventType === 'UPDATE') {
                        setNotas(current => 
                            current.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
                        )
                    } else if (payload.eventType === 'DELETE') {
                        setNotas(current => current.filter(n => n.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orgId])

    const handleCancelar = async (id: string) => {
        if (!justificativa || justificativa.length < 15) {
            alert('A justificativa deve ter pelo menos 15 caracteres.')
            return
        }

        try {
            const res = await fetch('/api/nf/cancelar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, justificativa })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar nota')
            
            alert('Cancelamento solicitado com sucesso!')
            setIsCancelling(null)
            setJustificativa('')
        } catch (error: any) {
            alert(error.message)
        }
    }

    if (!notas || notas.length === 0) {
        return <p style={{ color: 'var(--text-secondary)' }}>Nenhuma nota fiscal foi emitida ainda.</p>
    }

    const formatCurrency = (value: number | null) => {
        if (value === null) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Número</th>
                        <th>Tutor/Cliente</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {notas.map((nota) => (
                        <tr key={nota.id}>
                            <td>{new Date(nota.created_at).toLocaleDateString('pt-BR')}</td>
                            <td style={{ textTransform: 'uppercase' }}>{nota.tipo}</td>
                            <td>{nota.numero_nf || '-'}</td>
                            <td>{nota.tomador_nome || 'Consumidor Final'}</td>
                            <td>{formatCurrency(nota.valor_total)}</td>
                            <td style={{ textAlign: 'center', minWidth: '150px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span className={`${styles.badge} ${styles['badge-' + nota.status]}`}>
                                        {nota.status === 'processando' ? '⏳ Processando' : 
                                         nota.status === 'autorizado' ? '✅ Autorizado' :
                                         nota.status === 'erro' ? '❌ Erro' :
                                         nota.status === 'cancelado' ? '🚫 Cancelado' : nota.status}
                                    </span>
                                    {nota.status === 'erro' && nota.mensagem_sefaz && (
                                        <button 
                                            onClick={() => setSelectedError(nota.mensagem_sefaz)}
                                            style={{ 
                                                fontSize: '0.7rem', 
                                                background: 'rgba(231, 76, 60, 0.1)', 
                                                border: '1px solid rgba(231, 76, 60, 0.3)',
                                                borderRadius: '4px',
                                                color: '#ff6b6b',
                                                cursor: 'pointer',
                                                padding: '2px 6px'
                                            }}
                                        >
                                            ℹ️ Ver Motivo
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                {nota.status === 'autorizado' && (
                                    <>
                                        {nota.caminho_pdf && (
                                            <a 
                                                href={nota.caminho_pdf.startsWith('http') ? nota.caminho_pdf : `https://api.focusnfe.com.br${nota.caminho_pdf}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className={styles.actionButton}
                                                title="Ver PDF"
                                            >
                                                📄 PDF
                                            </a>
                                        )}
                                        <button 
                                            onClick={() => setIsCancelling(nota.id)}
                                            className={styles.actionButton}
                                            style={{ backgroundColor: '#e74c3c', color: 'white' }}
                                            title="Cancelar Nota"
                                        >
                                            🚫 Cancelar
                                        </button>
                                    </>
                                )}
                                {nota.status === 'processando' && (
                                    <button 
                                        onClick={async () => {
                                            const res = await fetch(`/api/nf/sync?ref=${nota.referencia}&org_id=${nota.org_id}`)
                                            // Realtime já cuidará do update, mas podemos dar um feedback
                                            if (!res.ok) alert('Erro ao sincronizar')
                                        }}
                                        className={styles.actionButton}
                                        style={{ backgroundColor: 'var(--primary-main)', color: 'white' }}
                                    >
                                        🔄 Sincronizar
                                    </button>
                                )}
                                {nota.status === 'erro' && (
                                    <button 
                                        onClick={async () => {
                                            const res = await fetch(`/api/nf/sync?ref=${nota.referencia}&org_id=${nota.org_id}`)
                                            if (!res.ok) alert('Erro ao sincronizar')
                                        }}
                                        className={styles.actionButton}
                                        style={{ backgroundColor: 'var(--primary-main)', opacity: 0.8 }}
                                    >
                                        🔄 Re-sincronizar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal de Cancelamento */}
            {isCancelling && (
                <div className={styles.modalOverlay} onClick={() => setIsCancelling(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 style={{ margin: 0 }}>Cancelar Nota Fiscal</h3>
                            <button className={styles.closeButton} onClick={() => setIsCancelling(null)}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Descreva o motivo do cancelamento (mínimo 15 caracteres):</p>
                            <textarea 
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                placeholder="Ex: O cliente desistiu do serviço e solicitou estorno..."
                                style={{ 
                                    width: '100%', 
                                    minHeight: '100px', 
                                    padding: '8px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    marginTop: '8px'
                                }}
                            />
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'right' }}>
                            <button 
                                className={styles.secondaryButton} 
                                onClick={() => setIsCancelling(null)}
                            >
                                Voltar
                            </button>
                            <button 
                                className={styles.primaryButton} 
                                style={{ backgroundColor: '#e74c3c' }}
                                onClick={() => handleCancelar(isCancelling)}
                            >
                                Confirmar Cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Erro */}
            {selectedError && (
                <div className={styles.modalOverlay} onClick={() => setSelectedError(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 style={{ margin: 0, color: '#ff6b6b' }}>Motivo da Rejeição</h3>
                            <button className={styles.closeButton} onClick={() => setSelectedError(null)}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>{selectedError}</p>
                        </div>
                        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                            <button 
                                className={styles.primaryButton} 
                                onClick={() => setSelectedError(null)}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
