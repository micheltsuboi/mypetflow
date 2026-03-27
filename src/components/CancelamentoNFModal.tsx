'use client'

import { useState } from 'react'
import styles from './CancelamentoNFModal.module.css'

interface CancelamentoNFModalProps {
    nfId: string
    numeroNf?: string
    onClose: () => void
    onSuccess: () => void
}

export default function CancelamentoNFModal({ nfId, numeroNf, onClose, onSuccess }: CancelamentoNFModalProps) {
    const [justificativa, setJustificativa] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleConfirm = async () => {
        if (justificativa.length < 15) {
            setError('A justificativa deve ter pelo menos 15 caracteres.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/nf/cancelar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: nfId, justificativa })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao cancelar nota fiscal.')
            } else {
                onSuccess()
            }
        } catch (err: any) {
            setError('Erro de conexão com o servidor.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 className={styles.title}>Cancelar Nota Fiscal</h2>
                <p className={styles.description}>
                    Tem certeza que deseja cancelar a nota fiscal{numeroNf ? ` nº ${numeroNf}` : ''}? 
                    Esta ação é irreversível e será comunicada à SEFAZ.
                </p>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Justificativa do Cancelamento</label>
                    <textarea 
                        className={styles.textarea}
                        rows={4}
                        placeholder="Ex: Erro no preenchimento dos dados do cliente ou desistência da compra..."
                        value={justificativa}
                        onChange={e => setJustificativa(e.target.value)}
                        disabled={loading}
                    />
                    <small style={{ color: justificativa.length < 15 ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                        Mínimo 15 caracteres ({justificativa.length}/15)
                    </small>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                        Voltar
                    </button>
                    <button 
                        className={styles.confirmBtn} 
                        onClick={handleConfirm} 
                        disabled={loading || justificativa.length < 15}
                    >
                        {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </button>
                </div>
            </div>
        </div>
    )
}
