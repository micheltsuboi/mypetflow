'use client'

import { NotaFiscal } from '@/types/database'
import styles from './page.module.css'

interface Props {
    notas: NotaFiscal[]
}

export default function NotaFiscalList({ notas }: Props) {
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
                            <td>
                                <span className={`${styles.badge} ${styles['badge-' + nota.status]}`}>
                                    {nota.status}
                                </span>
                            </td>
                            <td>
                                {nota.status === 'autorizado' && nota.caminho_pdf && (
                                    <a 
                                        href={'https://api.focusnfe.com.br' + nota.caminho_pdf} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={styles.actionButton}
                                    >
                                        PDF
                                    </a>
                                )}
                                {nota.status === 'erro' && nota.mensagem_sefaz && (
                                    <span title={nota.mensagem_sefaz} className={styles.textError}>
                                        ⚠️ Motivo
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
