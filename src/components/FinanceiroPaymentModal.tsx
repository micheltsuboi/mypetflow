'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CreditCard, Check, X, Percent, Wallet, Banknote } from 'lucide-react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface GenericPaymentModalProps {
    recordId: string
    tableName: 'appointments' | 'orders' | 'vet_consultations' | 'vet_exams' | 'hospital_admissions' | 'pet_vaccines' | 'customer_packages'
    title: string
    baseAmount: number
    onClose: () => void
    onSuccess: () => void
}

const paymentMethodLabels: Record<string, string> = {
    pix: '💠 PIX',
    credit: '💳 Crédito',
    debit: '💳 Débito',
    cash: '💵 Dinheiro',
    credit_package: '📦 Pacote'
}

export default function FinanceiroPaymentModal({
    recordId,
    tableName,
    title,
    baseAmount,
    onClose,
    onSuccess
}: GenericPaymentModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [discountValue, setDiscountValue] = useState('0')
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
    const [finalAmount, setFinalAmount] = useState(baseAmount)

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const val = parseFloat(discountValue) || 0
        if (discountType === 'percent') {
            setFinalAmount(baseAmount - (baseAmount * (val / 100)))
        } else {
            setFinalAmount(Math.max(0, baseAmount - val))
        }
    }, [discountValue, discountType, baseAmount])

    if (!mounted) return null

    const handlePayment = async (method: string) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Não autorizado')

            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) throw new Error('Org não encontrada')

            // Update main record
            const updateData: any = {
                payment_status: 'paid',
                payment_method: method,
            }

            // Tables have different discount columns
            if (tableName === 'appointments') {
                updateData.final_price = finalAmount
                updateData.paid_at = new Date().toISOString()
                if (discountType === 'percent') {
                    updateData.discount_percent = parseFloat(discountValue)
                    updateData.discount = baseAmount - finalAmount
                } else {
                    updateData.discount = parseFloat(discountValue)
                }
            } else if (tableName === 'orders') {
                updateData.discount_amount = baseAmount - finalAmount
                updateData.total_amount = finalAmount
            } else if (tableName === 'vet_consultations' || tableName === 'vet_exams') {
                if (tableName === 'vet_consultations') {
                    updateData.consultation_fee = baseAmount
                } else {
                    updateData.price = baseAmount
                }
                updateData.discount_type = discountType
                if (discountType === 'percent') updateData.discount_percent = parseFloat(discountValue)
                else updateData.discount_fixed = parseFloat(discountValue)
            } else if (tableName === 'hospital_admissions') {
                updateData.total_amount = finalAmount
                updateData.discount_amount = baseAmount - finalAmount
            } else if (tableName === 'pet_vaccines') {
                updateData.price = finalAmount
            } else if (tableName === 'customer_packages') {
                updateData.total_paid = finalAmount
            }

            const { error: updateError } = await supabase
                .from(tableName)
                .update(updateData)
                .eq('id', recordId)

            if (updateError) throw updateError

            // Register Financial Transaction
            const categoryMap: any = {
                appointments: 'Serviços',
                orders: 'Venda Produto',
                vet_consultations: 'Consulta Veterinária',
                vet_exams: 'Exame Veterinário',
                hospital_admissions: 'Internamento / Hospital',
                pet_vaccines: 'Vacinas',
                customer_packages: 'Pacotes'
            }

            const { error: txError } = await supabase.from('financial_transactions').insert({
                org_id: profile.org_id,
                type: 'income',
                category: categoryMap[tableName] || 'Outros',
                amount: finalAmount,
                description: tableName === 'customer_packages'
                    ? `${title} referente ao mês de ${new Date().toLocaleString('pt-BR', { month: 'long' })} pago`
                    : `Recebimento #${recordId.substring(0, 8)} [${title}] via ${method}`,
                payment_method: method,
                date: new Date().toISOString(),
                created_by: user.id,
                reference_id: recordId
            })

            if (txError) throw txError

            onSuccess()
        } catch (error: any) {
            console.error('Payment error:', error)
            alert('Erro ao processar pagamento: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
                background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--bg-secondary)', borderRadius: '16px', padding: '2rem',
                    width: '100%', maxWidth: '450px', boxShadow: 'var(--shadow-xl)',
                    position: 'relative', border: '1px solid var(--card-border)', color: 'var(--text-primary)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--divider)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--gradient-primary)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                            <DollarSign size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirmar Pagamento</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <span>Valor Original:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {baseAmount.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Desconto:</span>
                            <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--input-border)' }}>
                                <button 
                                    onClick={() => setDiscountType('percent')}
                                    style={{ 
                                        padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        background: discountType === 'percent' ? 'var(--primary)' : 'transparent',
                                        color: discountType === 'percent' ? 'white' : 'var(--text-muted)',
                                        fontWeight: 700
                                    }}>%</button>
                                <button 
                                    onClick={() => setDiscountType('fixed')}
                                    style={{ 
                                        padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        background: discountType === 'fixed' ? 'var(--primary)' : 'transparent',
                                        color: discountType === 'fixed' ? 'white' : 'var(--text-muted)',
                                        fontWeight: 700
                                    }}>R$</button>
                            </div>
                        </div>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            style={{
                                width: '90px', padding: '8px', borderRadius: '8px', background: 'var(--bg-primary)',
                                color: 'var(--text-primary)', border: '1px solid var(--input-border)', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600
                            }}
                        />
                    </div>

                    <div style={{ borderTop: '1px solid var(--divider)', marginTop: '0.75rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        <span>Total a Pagar:</span>
                        <span style={{ color: 'var(--primary)' }}>R$ {finalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={18} color="#0ea5e9" /> Método de Pagamento:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {Object.entries(paymentMethodLabels).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => handlePayment(key)}
                                disabled={loading}
                                style={{
                                    padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)',
                                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: loading ? 'wait' : 'pointer',
                                    fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                                }}
                            >
                                <div style={{ background: 'var(--bg-secondary)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                    {key === 'pix' && <DollarSign size={16} color="var(--primary)" />}
                                    {key === 'credit' && <CreditCard size={16} color="var(--primary)" />}
                                    {key === 'debit' && <CreditCard size={16} color="var(--primary)" />}
                                    {key === 'cash' && <Banknote size={16} color="var(--primary)" />}
                                    {key === 'credit_package' && <Wallet size={16} color="var(--primary)" />}
                                </div>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
