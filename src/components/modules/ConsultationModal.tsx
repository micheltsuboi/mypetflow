'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ConsultationModal.module.css'
import { autosaveVetConsultation, getVeterinarians } from '@/app/actions/veterinary'

interface ConsultationModalProps {
    consultation: any
    onClose: () => void
    onSave?: () => void
}

export default function ConsultationModal({ consultation, onClose, onSave }: ConsultationModalProps) {
    const [formData, setFormData] = useState(consultation)
    const [vets, setVets] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const autosaveTimer = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        getVeterinarians().then(setVets)
    }, [])

    const handleFieldChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }))

        // Autosave logic
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

        setSaving(true)
        autosaveTimer.current = setTimeout(async () => {
            const res = await autosaveVetConsultation(consultation.id, field, value)
            if (res.success) {
                setLastSaved(new Date())
            }
            setSaving(false)
        }, 1000)
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2>🩺 Prontuário de Atendimento</h2>
                        <span className={styles.petName}>Pet: {consultation.pets?.name || 'Carregando...'}</span>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.statusInfo}>
                            {saving ? (
                                <span className={styles.saving}>☁️ Salvando...</span>
                            ) : lastSaved ? (
                                <span className={styles.saved}>✓ Salvo às {lastSaved.toLocaleTimeString('pt-BR')}</span>
                            ) : null}
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>×</button>
                    </div>
                </div>

                <div className={styles.body}>
                    <div className={styles.topGrid}>
                        <div className={styles.formGroup}>
                            <label>Veterinário Responsável</label>
                            <select
                                value={formData.veterinarian_id || ''}
                                onChange={(e) => handleFieldChange('veterinarian_id', e.target.value)}
                                className={styles.select}
                            >
                                <option value="">Selecione...</option>
                                {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Data da Consulta</label>
                            <input
                                type="date"
                                value={formData.consultation_date?.split('T')[0] || ''}
                                onChange={(e) => handleFieldChange('consultation_date', e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Motivo da Consulta / Queixa Principal</label>
                        <input
                            type="text"
                            value={formData.reason || ''}
                            onChange={(e) => handleFieldChange('reason', e.target.value)}
                            className={styles.input}
                            placeholder="Ex: Vômitos, check-up anual, coceira..."
                        />
                    </div>

                    <div className={styles.mainGrid}>
                        <div className={styles.formGroup}>
                            <label>Diagnóstico / Suspeita Clínica</label>
                            <textarea
                                value={formData.diagnosis || ''}
                                onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
                                className={styles.textarea}
                                style={{ minHeight: '100px' }}
                                placeholder="Descreva os achados e a conclusão clínica..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Tratamento / Conduta / Procedimentos</label>
                            <textarea
                                value={formData.treatment || ''}
                                onChange={(e) => handleFieldChange('treatment', e.target.value)}
                                className={styles.textarea}
                                style={{ minHeight: '100px' }}
                                placeholder="Quais procedimentos foram realizados hoje?"
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Prescrição Médica / Receita</label>
                        <textarea
                            value={formData.prescription || ''}
                            onChange={(e) => handleFieldChange('prescription', e.target.value)}
                            className={styles.textarea}
                            style={{ minHeight: '150px', borderColor: 'var(--primary)', borderWidth: '2px' }}
                            placeholder="Liste os medicamentos, dosagens e horários..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Observações Internas (Não aparecem na receita)</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            className={styles.textarea}
                            style={{ minHeight: '80px' }}
                        />
                    </div>

                    <div className={styles.footerGrid}>
                        <div className={styles.formGroup}>
                            <label>Valor da Consulta (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.consultation_fee || 0}
                                onChange={(e) => handleFieldChange('consultation_fee', parseFloat(e.target.value))}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Desconto (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.discount_percent || 0}
                                onChange={(e) => handleFieldChange('discount_percent', parseFloat(e.target.value))}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Status Pagamento</label>
                            <select
                                value={formData.payment_status || 'pending'}
                                onChange={(e) => handleFieldChange('payment_status', e.target.value)}
                                className={styles.select}
                            >
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Forma de Pagamento</label>
                            <select
                                value={formData.payment_method || 'pix'}
                                onChange={(e) => handleFieldChange('payment_method', e.target.value)}
                                className={styles.select}
                            >
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro</option>
                                <option value="credit">Crédito</option>
                                <option value="debit">Débito</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <p className={styles.hint}>Os dados são salvos automaticamente conforme você digita. ☁️</p>
                    <button className={styles.finishBtn} onClick={() => { onSave?.(); onClose(); }}>Finalizar e Fechar</button>
                </div>
            </div>
        </div>
    )
}
