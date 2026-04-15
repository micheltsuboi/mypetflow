'use client'

import { useState, useEffect } from 'react'
import styles from './PaymentManager.module.css'
import { getPaymentSummary, registerReferencePayment, deleteReferencePayment } from '@/app/actions/finance'

interface PaymentManagerProps {
    refId: string
    refType: 'consultation' | 'appointment' | 'package' | 'vaccine'
    totalDue: number
    onStatusChange?: (newStatus: string) => void
}

export default function PaymentManager({ refId, refType, totalDue, onStatusChange }: PaymentManagerProps) {
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [amount, setAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState('pix')

    const fetchSummary = async () => {
        setLoading(true)
        const res = await getPaymentSummary(refId, refType, totalDue)
        if (res.success) {
            setSummary(res)
            onStatusChange?.(res.status)
            // Default amount to balance
            setAmount(res.balance > 0 ? res.balance : 0)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (refId && totalDue >= 0) {
            fetchSummary()
        }
    }, [refId, totalDue])

    const handleAddPayment = async () => {
        if (amount <= 0) return
        setAdding(true)
        const res = await registerReferencePayment({
            refId,
            refType,
            amount,
            paymentMethod,
            totalDue,
            category: 'Recebimento Parcial',
            description: `Pagamento recebido para ${refType}`
        })
        if (res.success) {
            await fetchSummary()
            setAmount(0)
        } else {
            alert(res.message)
        }
        setAdding(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente remover este pagamento?')) return
        const res = await deleteReferencePayment(id, refId, refType, totalDue)
        if (res.success) {
            fetchSummary()
        } else {
            alert(res.message)
        }
    }

    if (loading && !summary) return <div className={styles.emptyState}>Carregando financeiro...</div>

    const progressPercent = totalDue > 0 ? Math.min(100, (summary?.totalPaid / totalDue) * 100) : 0

    return (
        <div className={styles.container}>
            <div className={styles.summary}>
                <div className={styles.summaryItem}>
                    <label>Valor Total:</label>
                    <span>R$ {totalDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={styles.summaryItem}>
                    <label>Total Pago:</label>
                    <span className={styles.transAmount}>R$ {summary?.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill} 
                        style={{ width: `${progressPercent}%`, background: progressPercent >= 100 ? '#10b981' : 'var(--primary)' }}
                    />
                </div>

                <div className={`${styles.summaryItem} ${styles.balance}`}>
                    <label>Saldo Devedor:</label>
                    <span>R$ {summary?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className={styles.history}>
                <h4>🕒 Histórico de Recebimentos</h4>
                <div className={styles.transactionList}>
                    {summary?.transactions.length === 0 ? (
                        <div className={styles.emptyState}>Nenhum pagamento registrado.</div>
                    ) : (
                        summary?.transactions.map((t: any) => (
                            <div key={t.id} className={styles.transactionCard}>
                                <div className={styles.transInfo}>
                                    <span className={styles.transMethod}>{t.payment_method}</span>
                                    <span className={styles.transDate}>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className={styles.transAmount}>R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(t.id)}>×</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {summary?.balance > 0 && (
                <div className={styles.paymentForm}>
                    <h4>💵 Registrar Novo Pagamento</h4>
                    <div className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                            <label>Valor</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                                className={styles.input}
                                max={summary?.balance}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Método</label>
                            <select 
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className={styles.select}
                            >
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="bank_transfer">Transferência</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        className={styles.addBtn}
                        onClick={handleAddPayment}
                        disabled={adding || amount <= 0}
                    >
                        {adding ? 'Registrando...' : 'Confirmar Pagamento'}
                    </button>
                </div>
            )}
        </div>
    )
}
