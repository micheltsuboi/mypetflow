'use client'

import { useState, useRef, useEffect } from 'react'
import { updatePaymentStatus, applyDiscount } from '@/app/actions/appointment'
import { DollarSign, CreditCard, Check, X, Percent, Wallet, Banknote } from 'lucide-react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import PaymentManager from './finance/PaymentManager'

interface PaymentControlsProps {
    appointmentId: string
    calculatedPrice: number | null
    finalPrice: number | null
    discountPercent: number | null
    discountType?: string | null
    discountFixed?: number | null
    paymentStatus: string | null
    paymentMethod: string | null
    isPackage?: boolean | null
    isSubscription?: boolean | null
    totalPaid?: number | null
    onUpdate?: (newStatus?: string) => void
    onPaymentAuthorized?: (method: string) => void
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
    discountType,
    discountFixed,
    paymentStatus,
    paymentMethod,
    isPackage,
    isSubscription,
    totalPaid,
    onUpdate,
    onPaymentAuthorized,
    compact = false
}: PaymentControlsProps) {
    const [showModal, setShowModal] = useState(false)
    const [discountValue, setDiscountValue] = useState(
        discountType === 'fixed' 
            ? (discountFixed?.toString() || '0') 
            : (discountPercent?.toString() || '0')
    )
    const [discountTypeState, setDiscountTypeState] = useState<'percent' | 'fixed'>(
        (discountType as 'percent' | 'fixed') || 'percent'
    )
    const [loading, setLoading] = useState(false)

    const supabase = createClient()
    const [fetchedPackagePrice, setFetchedPackagePrice] = useState<number | null>(null)
    const [isClient, setIsClient] = useState(false)

    const isPaid = paymentStatus === 'paid'
    const basePrice = fetchedPackagePrice ?? calculatedPrice ?? 0
    const displayPrice = fetchedPackagePrice ?? finalPrice ?? calculatedPrice ?? 0
    const remainingBalance = Math.max(0, displayPrice - (totalPaid || 0))

    // Detectar agendamento de pacote via prop explícita ou método de pagamento
    const isPackageAppointment = isPackage === true || paymentMethod === 'credit_package'

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (isPackageAppointment && !fetchedPackagePrice) {
            const fetchPrice = async () => {
                const { data } = await supabase.from('appointments').select('package_credit_id').eq('id', appointmentId).single()
                if (data?.package_credit_id) {
                    const { data: pc } = await supabase.from('package_credits').select('customer_package_id').eq('id', data.package_credit_id).single()
                    if (pc?.customer_package_id) {
                        const { data: cp } = await supabase.from('customer_packages').select('total_paid, total_price').eq('id', pc.customer_package_id).single()
                        if (cp) {
                            setFetchedPackagePrice(Number(cp.total_price || cp.total_paid || 0))
                        }
                    }
                }
            }
            fetchPrice()
        }
    }, [isPackageAppointment, appointmentId, supabase, fetchedPackagePrice])


    // Reset local state when props change
    useEffect(() => {
        setDiscountValue(
            discountType === 'fixed' 
                ? (discountFixed?.toString() || '0') 
                : (discountPercent?.toString() || '0')
        )
        setDiscountTypeState((discountType as 'percent' | 'fixed') || 'percent')
    }, [discountPercent, discountType, discountFixed])

    const handlePayment = async (method: string) => {
        setLoading(true)
        try {
            await updatePaymentStatus(appointmentId, 'paid', method)
            onUpdate?.('paid')
            onPaymentAuthorized?.(method)
            setShowModal(false)
        } finally {
            setLoading(false)
        }
    }

    const handleUnpay = async () => {
        setLoading(true)
        try {
            await updatePaymentStatus(appointmentId, 'pending')
            onUpdate?.('pending')
            // Keep modal open to show change
        } finally {
            setLoading(false)
        }
    }

    const handleDiscount = async () => {
        const value = parseFloat(discountValue)
        if (isNaN(value) || value < 0) return
        if (discountTypeState === 'percent' && value > 100) return
        
        setLoading(true)
        try {
            await applyDiscount(appointmentId, value, discountTypeState, basePrice)
            onUpdate?.(paymentStatus || undefined)
        } finally {
            setLoading(false)
        }
    }

    // Modal Content
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
                    borderRadius: 'var(--radius-xl)',
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
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>Detalhes do Pagamento</h3>
                    </div>
                    <button
                        onClick={() => setShowModal(false)}
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Price Summary */}
                <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <span>Valor Base:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {Number(basePrice || 0).toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Desconto:</span>
                            {!isPaid && (
                                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
                                    <button 
                                        onClick={() => setDiscountTypeState('percent')}
                                        style={{ 
                                            padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            background: discountTypeState === 'percent' ? 'var(--color-sky)' : 'transparent',
                                            color: discountTypeState === 'percent' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                            fontWeight: 700,
                                            transition: 'all 0.2s'
                                        }}>%</button>
                                    <button 
                                        onClick={() => setDiscountTypeState('fixed')}
                                        style={{ 
                                            padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            background: discountTypeState === 'fixed' ? 'var(--color-sky)' : 'transparent',
                                            color: discountTypeState === 'fixed' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                            fontWeight: 700,
                                            transition: 'all 0.2s'
                                        }}>R$</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                min="0" 
                                max={discountTypeState === 'percent' ? 100 : undefined}
                                disabled={isPaid}
                                style={{
                                    width: '90px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border)',
                                    textAlign: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 600
                                }}
                            />
                            {!isPaid && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDiscount()
                                    }}
                                    disabled={loading}
                                    style={{
                                        fontSize: '0.85rem',
                                        padding: '0.5rem 1rem',
                                        background: 'var(--color-sky)',
                                        color: 'var(--bg-primary)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.2s',
                                        boxShadow: 'var(--shadow-glow-sky)'
                                    }}
                                >
                                    Aplicar
                                </button>
                            )}
                        </div>
                    </div>

                    {discountPercent && discountPercent > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-coral)', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Percent size={14} /> Desconto aplicado:</span>
                            <span>- R$ {(basePrice - displayPrice).toFixed(2)}</span>
                        </div>
                    ) : null}

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        <span>Total Final:</span>
                        <span style={{ color: 'var(--color-sky)', textShadow: '0 0 10px rgba(0, 228, 206, 0.4)' }}>R$ {Number(displayPrice || 0).toFixed(2)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isPaid ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                background: 'rgba(122, 201, 160, 0.1)',
                                color: 'var(--status-done)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1.25rem',
                                border: '1px solid rgba(122, 201, 160, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                fontWeight: 600,
                                fontSize: '1.05rem'
                            }}>
                                <Check size={20} /> Pago via {paymentMethodLabels[paymentMethod || ''] || paymentMethod}
                            </div>
                            <button
                                onClick={handleUnpay}
                                disabled={loading}
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                                <X size={16} style={{ marginBottom: '-2px', marginRight: '4px' }} /> Desfazer Pagamento
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CreditCard size={18} color="var(--color-sky)" /> Gerenciar Pagamentos:
                            </div>
                            <PaymentManager 
                                refId={appointmentId}
                                refType="appointment"
                                totalDue={displayPrice}
                                onStatusChange={(newStatus) => onUpdate?.(newStatus)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    // Main Card Display (Compact Badge)
    return (
        <>
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    setShowModal(true)
                }}
                style={{
                    marginTop: compact ? '0.25rem' : '0.5rem',
                    cursor: 'pointer',
                    display: 'inline-block',
                    transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
                {isPackageAppointment ? (
                    /* Badge especial para pacote/mensalidade */
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: isPaid ? (isSubscription ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)') : (isSubscription ? 'rgba(16, 185, 129, 0.08)' : 'rgba(139, 92, 246, 0.08)'),
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${isPaid ? (isSubscription ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)') : (isSubscription ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)')}`
                    }}>
                        <span style={{ fontSize: '0.8rem' }}>{isSubscription ? '🔄' : '📦'}</span>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: isSubscription ? '#10b981' : '#8b5cf6',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                        }}>
                            {isSubscription ? 'MENSALIDADE' : 'PACOTE'}
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isPaid ? '#10b981' : '#f59e0b',
                            marginLeft: '4px'
                        }}>
                            {isPaid ? '✓ Pago' : '⏳ Pendente'}
                        </span>
                        {fetchedPackagePrice !== null && (
                            <>
                                <span style={{
                                    width: '1px',
                                    height: '12px',
                                    background: isSubscription ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)',
                                    marginLeft: '4px'
                                }} />
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: isPaid ? '#10b981' : '#f59e0b',
                                    marginLeft: '4px'
                                }}>
                                    R$ {Number(fetchedPackagePrice || 0).toFixed(2)}
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    /* Badge normal com valor */
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                    }}>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: isPaid ? '#10b981' : '#f59e0b'
                        }}>
                            R$ {Number((paymentStatus === 'partial' ? remainingBalance : displayPrice) || 0).toFixed(2)}
                        </span>
                        <span style={{
                            width: '1px',
                            height: '12px',
                            background: isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                        }} />
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isPaid ? '#10b981' : paymentStatus === 'partial' ? '#f59e0b' : '#f54ef2',
                            marginLeft: '4px'
                        }}>
                            {isPaid ? '✓ Pago' : paymentStatus === 'partial' ? '⏳ Parcial' : '⏳ Pendente'}
                        </span>
                    </div>
                )}
            </div>

            {showModal && isClient && typeof document !== 'undefined' && createPortal(paymentModalJSX, document.body)}
        </>
    )
}
