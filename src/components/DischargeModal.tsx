'use client'

import { useState } from 'react'
import { dischargePetWithCheckout } from '@/app/actions/hospital'

interface DischargeModalProps {
    admission: any
    onClose: () => void
    onSuccess: () => void
}

export default function DischargeModal({ admission, onClose, onSuccess }: DischargeModalProps) {
    const [loading, setLoading] = useState(false)
    const [discountValue, setDiscountValue] = useState(0)
    const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent')
    const [paymentMethod, setPaymentMethod] = useState('pix')

    const admittedDate = new Date(admission.admitted_at)
    const dischargeDate = new Date()

    // Calcula o número de diárias (mínimo de 1)
    const diffMs = dischargeDate.getTime() - admittedDate.getTime()
    const diffDaysRaw = diffMs / (1000 * 60 * 60 * 24)
    const numDiarias = Math.max(1, Math.ceil(diffDaysRaw))

    const serviceName = admission.services?.name || 'Internamento Padrão'
    const servicePrice = admission.services?.base_price || 0
    const totalSemDesconto = numDiarias * servicePrice

    const getDiscountAmount = () => {
        if (discountType === 'percent') {
            return totalSemDesconto * (discountValue / 100)
        }
        return discountValue
    }

    const discountAmount = getDiscountAmount()
    const finalTotal = Math.max(0, totalSemDesconto - discountAmount)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const checkoutData = {
                total_amount: finalTotal,
                discount_amount: discountAmount,
                payment_method: paymentMethod
            }

            const res = await dischargePetWithCheckout(admission.id, admission.bed_id, checkoutData)
            if (res.success) {
                alert('Alta e faturamento concluídos com sucesso!')
                onSuccess()
            } else {
                alert(res.message)
            }
        } catch (error) {
            console.error(error)
            alert('Erro inesperado tentar dar alta.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card glass relative" style={{ width: '100%', maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-montserrat)', color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✅</span> Alta do Paciente
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-montserrat)' }}>Paciente: {admission.pets?.name}</p>
                    <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--font-montserrat)' }}>Leito: {admission.hospital_beds?.name}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                        <div><strong>Entrada:</strong> {admittedDate.toLocaleDateString()} às {admittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div><strong>Saída:</strong> {dischargeDate.toLocaleDateString()} às {dischargeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', fontFamily: 'var(--font-montserrat)' }}>Resumo Financeiro</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                            <span>Serviço Base de Diária:</span>
                            <span>{serviceName} (R$ {servicePrice.toFixed(2)})</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                            <span>Quantidade Apurada:</span>
                            <span>{numDiarias} diária(s)</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>
                            <span>Subtotal:</span>
                            <span>R$ {totalSemDesconto.toFixed(2)}</span>
                        </div>

                        {/* Descontos */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-montserrat)' }}>Aplicar Desconto (opcional)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input glass"
                                    style={{ flex: 1, fontFamily: 'var(--font-montserrat)' }}
                                    value={discountValue}
                                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                                <select
                                    className="input glass"
                                    style={{ width: '80px', fontFamily: 'var(--font-montserrat)', padding: '0 8px' }}
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value as 'percent' | 'value')}
                                >
                                    <option value="percent">%</option>
                                    <option value="value">R$</option>
                                </select>
                            </div>
                        </div>

                        {/* Pagamento */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-montserrat)' }}>Forma de Pagamento</label>
                            <select
                                className="input glass"
                                required
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                style={{ width: '100%', fontFamily: 'var(--font-montserrat)' }}
                            >
                                <option value="pix">Pix (Imediato)</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="cash">Dinheiro em Espécie</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-montserrat)', color: 'var(--text-secondary)' }}>Total a Receber:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-montserrat)', color: '#10B981' }}>R$ {finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button type="button" className="btn btn-outline" style={{ fontFamily: 'var(--font-montserrat)' }} onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{ fontFamily: 'var(--font-montserrat)' }} disabled={loading}>
                            {loading ? 'Processando...' : 'Confirmar Alta e Faturar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
