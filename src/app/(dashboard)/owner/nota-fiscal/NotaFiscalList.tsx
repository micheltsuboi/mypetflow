'use client'

import { useState } from 'react'
import { NotaFiscal } from '@/types/database'
import styles from './page.module.css'

interface Props {
    notas: NotaFiscal[]
}

export default function NotaFiscalList({ notas }: Props) {
    const [selectedError, setSelectedError] = useState<string | null>(null)

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
                                        {nota.caminho_xml && (
                                            <a 
                                                href={nota.caminho_xml.startsWith('http') ? nota.caminho_xml : `https://api.focusnfe.com.br${nota.caminho_xml}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className={styles.actionButton}
                                                title="Ver XML"
                                            >
                                                🔗 XML
                                            </a>
                                        )}
                                    </>
                                )}
                                {nota.status === 'processando' && (
                                    <button 
                                        onClick={async () => {
                                            const res = await fetch(`/api/nf/sync?ref=${nota.referencia}&org_id=${nota.org_id}`)
                                            if (res.ok) window.location.reload()
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
                                            if (res.ok) window.location.reload()
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
