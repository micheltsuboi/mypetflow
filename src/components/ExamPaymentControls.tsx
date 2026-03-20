'use client'

import { useState, useRef, useEffect } from 'react'
import { updateExamPayment } from '@/app/actions/veterinary'
import { DollarSign, CreditCard, Check, X, Percent, Wallet, Banknote } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ExamPaymentControlsProps {
    examId: string
    price: number | null
    discountPercent: number | null
    discountType?: string | null
    discountFixed?: number | null
    paymentStatus: string | null
    paymentMethod: string | null
    onUpdate?: () => void
    compact?: boolean
}

const paymentMethodLabels: Record<string, string> = {
    pix: '💠 PIX',
    credit: '💳 Crédito',
    debit: '💳 Débito',
    cash: '💵 Dinheiro'
}

export default function ExamPaymentControls({
    examId,
    price,
    discountPercent,
    discountType,
    discountFixed,
    paymentStatus,
    paymentMethod,
    onUpdate,
    compact = false
}: ExamPaymentControlsProps) {
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isClient, setIsClient] = useState(false)

    const isPaid = paymentStatus === 'paid'
    const basePrice = price ?? 0
    let finalPrice = basePrice;

    if (discountType === 'percent') {
        finalPrice = basePrice - (basePrice * (discountPercent ?? 0) / 100);
    } else if (discountType === 'fixed') {
        finalPrice = Math.max(0, basePrice - (discountFixed ?? 0));
    }

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handlePayment = async (method: string) => {
        setLoading(true)
        try {
            await updateExamPayment(examId, { payment_status: 'paid' })
            onUpdate?.()
            setShowModal(false)
        } finally {
            setLoading(false)
        }
    }

    const handleUnpay = async () => {
        setLoading(true)
        try {
            await updateExamPayment(examId, { payment_status: 'pending' })
            onUpdate?.()
        } finally {
            setLoading(false)
        }
    }

    const paymentModalJSX = (
        <div
            onClick={(e) => {
                e.stopPropagation()
                setShowModal(false)
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                padding: '1rem'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '450px',
                    boxShadow: 'var(--shadow-xl)',
                    position: 'relative',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--gradient-primary)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={20} color="white" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>Pagamento de Exame</h3>
                    </div>
                    <button
                        onClick={() => setShowModal(false)}
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <span>Valor do Exame:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {basePrice.toFixed(2)}</span>
                    </div>

                    {finalPrice !== basePrice && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-coral)' }}>
                            <span>Desconto:</span>
                            <span>- R$ {(basePrice - finalPrice).toFixed(2)}</span>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        <span>Total Final:</span>
                        <span style={{ color: 'var(--color-sky)' }}>R$ {finalPrice.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isPaid ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                padding: '1rem',
                                borderRadius: '12px',
                                marginBottom: '1.25rem',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                fontWeight: 600
                            }}>
                                <Check size={20} /> Pago
                            </div>
                            <button
                                onClick={handleUnpay}
                                disabled={loading}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                Desfazer Pagamento
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>Confirmar via:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => handlePayment(key)}
                                        disabled={loading}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            <div
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                style={{
                    cursor: 'pointer',
                    display: 'inline-block'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isPaid ? '#10b981' : '#f59e0b' }}>
                        R$ {finalPrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPaid ? '#10b981' : '#f59e0b' }}>
                        {isPaid ? 'Pago' : 'Pendente'}
                    </span>
                </div>
            </div>
            {showModal && isClient && createPortal(paymentModalJSX, document.body)}
        </>
    )
}
