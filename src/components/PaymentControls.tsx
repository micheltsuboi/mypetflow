'use client'

import { useState } from 'react'
import { updatePaymentStatus, applyDiscount } from '@/app/actions/appointment'

interface PaymentControlsProps {
    appointmentId: string
    calculatedPrice: number | null
    finalPrice: number | null
    discountPercent: number | null
    paymentStatus: string | null
    paymentMethod: string | null
    onUpdate?: () => void
    compact?: boolean
}

const paymentMethodLabels: Record<string, string> = {
    pix: '💠 PIX',
    credit: '💳 Crédito',
    debit: '💳 Débito',
    cash: '💵 Dinheiro',
    credit_package: '📦 Pacote'
}

export default function PaymentControls({
    appointmentId,
    calculatedPrice,
    finalPrice,
    discountPercent,
    paymentStatus,
    paymentMethod,
    onUpdate,
    compact = false
}: PaymentControlsProps) {
    const [showPayModal, setShowPayModal] = useState(false)
    const [showDiscountInput, setShowDiscountInput] = useState(false)
    const [discountValue, setDiscountValue] = useState(discountPercent?.toString() || '0')
    const [loading, setLoading] = useState(false)

    const isPaid = paymentStatus === 'paid'
    const displayPrice = finalPrice ?? calculatedPrice ?? 0

    const handlePayment = async (method: string) => {
        setLoading(true)
        try {
            await updatePaymentStatus(appointmentId, 'paid', method)
            onUpdate?.()
        } finally {
            setLoading(false)
            setShowPayModal(false)
        }
    }

    const handleUnpay = async () => {
        setLoading(true)
        try {
            await updatePaymentStatus(appointmentId, 'pending')
            onUpdate?.()
        } finally {
            setLoading(false)
        }
    }

    const handleDiscount = async () => {
        const percent = parseFloat(discountValue)
        if (isNaN(percent) || percent < 0 || percent > 100) return
        setLoading(true)
        try {
            await applyDiscount(appointmentId, percent)
            onUpdate?.()
        } finally {
            setLoading(false)
            setShowDiscountInput(false)
        }
    }

    return (
        <div style={{ marginTop: compact ? '0.25rem' : '0.5rem' }}>
            {/* Price Display */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Payment Status Badge */}
                    <span
                        onClick={(e) => {
                            e.stopPropagation()
                            if (isPaid) handleUnpay()
                            else setShowPayModal(true)
                        }}
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: isPaid ? '#10b981' : '#fbbf24',
                            border: `1px solid ${isPaid ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isPaid ? '✅ Pago' : '🟡 Pendente'}
                    </span>

                    {/* Payment Method (if paid) */}
                    {isPaid && paymentMethod && (
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {paymentMethodLabels[paymentMethod] || paymentMethod}
                        </span>
                    )}
                </div>

                {/* Price + Discount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {discountPercent && discountPercent > 0 ? (
                        <>
                            <span style={{
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                textDecoration: 'line-through'
                            }}>
                                R$ {(calculatedPrice || 0).toFixed(2)}
                            </span>
                            <span style={{
                                fontSize: '0.7rem',
                                color: '#f87171',
                                fontWeight: 600,
                                background: 'rgba(248, 113, 113, 0.1)',
                                padding: '1px 4px',
                                borderRadius: '4px'
                            }}>
                                -{discountPercent}%
                            </span>
                        </>
                    ) : null}
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: isPaid ? '#10b981' : '#e2e8f0',
                        background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                    }}>
                        R$ {displayPrice.toFixed(2)}
                    </span>

                    {/* Discount Toggle */}
                    {!isPaid && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowDiscountInput(!showDiscountInput)
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                color: '#f87171',
                                padding: '2px 4px'
                            }}
                            title="Aplicar desconto"
                        >
                            🏷️
                        </button>
                    )}
                </div>
            </div>

            {/* Discount Input */}
            {showDiscountInput && !isPaid && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        marginTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(248, 113, 113, 0.05)',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(248, 113, 113, 0.2)'
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: '#f87171' }}>🏷️ Desconto:</span>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        style={{
                            width: '60px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.8rem',
                            textAlign: 'center'
                        }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>%</span>
                    {discountValue && parseFloat(discountValue) > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            = R$ {((calculatedPrice || 0) * (1 - parseFloat(discountValue || '0') / 100)).toFixed(2)}
                        </span>
                    )}
                    <button
                        onClick={handleDiscount}
                        disabled={loading}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            background: '#f87171',
                            color: 'white',
                            cursor: loading ? 'wait' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                        }}
                    >
                        {loading ? '...' : 'Aplicar'}
                    </button>
                </div>
            )}

            {/* Payment Method Modal */}
            {showPayModal && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        marginTop: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}
                >
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>
                        💳 Forma de Pagamento:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(paymentMethodLabels).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => handlePayment(key)}
                                disabled={loading}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981',
                                    cursor: loading ? 'wait' : 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowPayModal(false)}
                        style={{
                            marginTop: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    )
}
