'use client'

import { useState, useEffect, useMemo } from 'react'
import { NotaFiscal } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import { Search, FileText, FileCode, Send, XCircle, Download, Settings, RefreshCw, AlertTriangle } from 'lucide-react'
import DateInput from '@/components/ui/DateInput'
import CancelamentoNFModal from '@/components/CancelamentoNFModal'
import { exportToCsv } from '@/utils/export'

interface Props {
    notas: NotaFiscal[]
    orgId: string
}

export default function NotaFiscalList({ notas: initialNotas, orgId }: Props) {
    const supabase = createClient()
    const [notas, setNotas] = useState<NotaFiscal[]>(initialNotas)
    const [selectedError, setSelectedError] = useState<string | null>(null)
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
    const [selectedNfToCancel, setSelectedNfToCancel] = useState<{ id: string, numero?: string } | null>(null)
    
    // Filters State
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })

    // Sync local state with props
    useEffect(() => {
        setNotas(initialNotas)
    }, [initialNotas])

    // Realtime Integration
    useEffect(() => {
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
    }, [orgId, supabase])

    const filteredNotas = useMemo(() => {
        return notas.filter(nota => {
            const matchesSearch = 
                (nota.tomador_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (nota.referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((nota as any).pet_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (nota.numero_nf || '').includes(searchTerm)

            const matchesStatus = statusFilter === 'all' || nota.status === statusFilter
            
            const notaDate = new Date(nota.created_at)
            const matchesDate = notaDate >= new Date(startDate) && notaDate <= new Date(endDate + 'T23:59:59')

            return matchesSearch && matchesStatus && matchesDate
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [notas, searchTerm, statusFilter, startDate, endDate])

    const handleAccountingExport = () => {
        const autorizadas = filteredNotas.filter(n => n.status === 'autorizado')
        if (autorizadas.length === 0) {
            alert('Não há notas autorizadas no período filtrado para exportar.')
            return
        }

        const headers = ['Data', 'Tipo', 'Número', 'Cliente', 'Pet', 'Valor', 'Status', 'PDF', 'XML']
        const rows = autorizadas.map(n => [
            new Date(n.created_at).toLocaleDateString('pt-BR'),
            n.tipo.toUpperCase(),
            n.numero_nf || '-',
            n.tomador_nome || 'Consumidor Final',
            (n as any).pet_name || (n.payload_enviado as any)?.petName || '-',
            (n.valor_total || 0).toFixed(2).replace('.', ','),
            n.status.toUpperCase(),
            n.caminho_pdf || '',
            (n as any).caminho_xml || ''
        ])

        exportToCsv(`relatorio_fiscal_${startDate}_${endDate}`, headers, rows)
    }

    const handleSendWhatsApp = async (nfId: string) => {
        try {
            const response = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nfId })
            })

            if (response.ok) {
                alert('Mensagem enviada para o WhatsApp do tutor!')
            } else {
                const err = await response.json()
                alert('Erro ao enviar WhatsApp: ' + (err.message || 'Erro desconhecido'))
            }
        } catch (error) {
            console.error('Erro ao chamar send-whatsapp:', error)
            alert('Erro ao comunicar com o servidor.')
        }
    }

    const handleSync = async (nota: NotaFiscal) => {
        try {
            const res = await fetch(`/api/nf/sync?ref=${nota.referencia}&org_id=${nota.org_id}`)
            if (!res.ok) throw new Error('Erro ao sincronizar')
        } catch (error: any) {
            alert(error.message)
        }
    }

    const handleOpenCancel = (nota: NotaFiscal) => {
        setSelectedNfToCancel({ id: nota.id, numero: nota.numero_nf || undefined })
        setIsCancelModalOpen(true)
    }

    const formatCurrency = (value: number | null) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
    }

    return (
        <div className={styles.nfDashboard}>
            <div className={styles.filtersRow}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, pet ou número..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className={styles.selectFilter}
                >
                    <option value="all">Todos os Status</option>
                    <option value="autorizado">Autorizadas</option>
                    <option value="processando">Processando</option>
                    <option value="erro">Com Erro</option>
                    <option value="cancelado">Canceladas</option>
                </select>

                <div className={styles.dateFilterGroup}>
                    <label>De:</label>
                    <DateInput value={startDate} onChange={setStartDate} name="start" />
                </div>
                
                <div className={styles.dateFilterGroup}>
                    <label>Até:</label>
                    <DateInput value={endDate} onChange={setEndDate} name="end" />
                </div>

                <button className={styles.exportButton} onClick={handleAccountingExport}>
                    <Download size={18} />
                    <span>Exportar Contabilidade</span>
                </button>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Número</th>
                            <th>Cliente / Pet</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredNotas.map((nota) => (
                            <tr key={nota.id}>
                                <td>{new Date(nota.created_at).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    <span className={styles.nfType}>{nota.tipo.toUpperCase()}</span>
                                </td>
                                <td><strong>{nota.numero_nf || '-'}</strong></td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{nota.tomador_nome || 'Consumidor Final'}</span>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                            {(nota as any).pet_name || (nota.payload_enviado as any)?.petName || '-'}
                                        </small>
                                    </div>
                                </td>
                                <td>{formatCurrency(nota.valor_total)}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span className={`${styles.statusBadge} ${styles[nota.status]}`}>
                                            {nota.status === 'processando' && <RefreshCw size={12} className={styles.spin} />}
                                            {nota.status.toUpperCase()}
                                        </span>
                                        {nota.status === 'erro' && (
                                            <button 
                                                onClick={() => setSelectedError(nota.mensagem_sefaz || 'Erro não detalhado')}
                                                className={styles.errorBtn}
                                                style={{ fontSize: '0.7rem', color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                                            >
                                                Ver motivo
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.actionsRow}>
                                        {nota.status === 'autorizado' && (
                                            <>
                                                {nota.caminho_pdf && (
                                                    <button 
                                                        className={styles.actionBtn}
                                                        onClick={() => window.open(nota.caminho_pdf!.startsWith('http') ? nota.caminho_pdf! : `https://api.focusnfe.com.br${nota.caminho_pdf}`, '_blank')}
                                                        title="Ver PDF"
                                                    >
                                                        <FileText size={16} />
                                                        <span>PDF</span>
                                                    </button>
                                                )}
                                                {nota.caminho_xml && (
                                                    <button 
                                                        className={`${styles.actionBtn} ${styles.xmlBtn}`}
                                                        onClick={() => window.open(nota.caminho_xml!.startsWith('http') ? nota.caminho_xml! : `https://api.focusnfe.com.br${nota.caminho_xml}`, '_blank')}
                                                        title="Baixar XML"
                                                    >
                                                        <FileCode size={16} />
                                                        <span>XML</span>
                                                    </button>
                                                )}
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.whatsappBtn}`}
                                                    onClick={() => handleSendWhatsApp(nota.id)}
                                                    title="Enviar WhatsApp"
                                                >
                                                    <Send size={16} />
                                                </button>
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                                    onClick={() => handleOpenCancel(nota)}
                                                    title="Cancelar Nota"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                        {(nota.status === 'processando' || nota.status === 'erro') && (
                                            <button 
                                                onClick={() => handleSync(nota)}
                                                className={styles.actionBtn}
                                                title="Sincronizar com SEFAZ"
                                            >
                                                <RefreshCw size={16} />
                                                <span>Sincronizar</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredNotas.length === 0 && (
                    <div className={styles.placeholder}>
                        Nenhuma nota fiscal encontrada para os filtros selecionados.
                    </div>
                )}
            </div>

            {/* Error Details Modal */}
            {selectedError && (
                <div className={styles.modalOverlay} onClick={() => setSelectedError(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b' }}>
                                <AlertTriangle size={20} />
                                Detalhes do Erro
                            </h3>
                            <button className={styles.closeButton} onClick={() => setSelectedError(null)}>&times;</button>
                        </div>
                        <div className={styles.modalBody} style={{ background: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedError}</p>
                        </div>
                        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                            <button 
                                className={styles.primaryButton} 
                                style={{ background: 'var(--primary)', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                                onClick={() => setSelectedError(null)}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {isCancelModalOpen && selectedNfToCancel && (
                <CancelamentoNFModal 
                    nfId={selectedNfToCancel.id}
                    numeroNf={selectedNfToCancel.numero}
                    onClose={() => setIsCancelModalOpen(false)}
                    onSuccess={() => {
                        setIsCancelModalOpen(false)
                        // fetchFinancials não é necessário aqui pois temos props, 
                        // mas o realtime cuidará do update visual
                    }}
                />
            )}
            
            <style jsx>{`
                .spin {
                    animation: spin 1.5s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
