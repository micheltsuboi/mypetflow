'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ConsultationModal.module.css'
import { autosaveVetConsultation, getVeterinarians, finishVetConsultation, getOrganizationLogo } from '@/app/actions/veterinary'
import BodyMap from './BodyMap'
import DateInput from '../ui/DateInput'
import EmitirNFModal from '../EmitirNFModal'
import PaymentManager from '../finance/PaymentManager'

interface ConsultationModalProps {
    consultation: any
    onClose: () => void
    onSave?: () => void
    readOnly?: boolean
}

export default function ConsultationModal({ consultation, onClose, onSave, readOnly = false }: ConsultationModalProps) {
    const [formData, setFormData] = useState(consultation)
    const [vets, setVets] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [showNFModal, setShowNFModal] = useState(false)
    const [nfData, setNfData] = useState<{ id: string, status: string, pdf_url?: string } | null>(null)
    const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
    const pendingSave = useRef<{ field: string, value: any } | null>(null)

    const calculateFinalTotal = () => {
        const fee = Number(formData.consultation_fee || 0)
        const discFixed = Number(formData.discount_fixed || 0)
        const discPercent = Number(formData.discount_percent || 0)
        
        if (formData.discount_type === 'percent') {
            return fee - (fee * (discPercent / 100))
        }
        return Math.max(0, fee - discFixed)
    }

    useEffect(() => {
        getVeterinarians().then(setVets)
        
        // Fetch NF Status
        const fetchNF = async () => {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: nf } = await supabase
                .from('notas_fiscais')
                .select('id, status, caminho_pdf')
                .eq('origem_tipo', 'atendimento')
                .eq('origem_id', consultation.id)
                .maybeSingle()
            
            if (nf) {
                setNfData({
                    id: nf.id,
                    status: nf.status,
                    pdf_url: nf.caminho_pdf
                })
            }
        }
        fetchNF()

        return () => {
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
        }
    }, [consultation.id])

    const handleSendWhatsApp = async () => {
        if (!nfData) return

        try {
            const response = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nfId: nfData.id })
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

    const handleFieldChange = (field: string, value: any) => {
        if (readOnly) return;
        setFormData((prev: any) => ({ ...prev, [field]: value }))
        pendingSave.current = { field, value }

        // Autosave logic
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

        setSaving(true)
        autosaveTimer.current = setTimeout(async () => {
            const res = await autosaveVetConsultation(consultation.id, field, value)
            if (res.success) {
                setLastSaved(new Date())
                if (pendingSave.current?.field === field && pendingSave.current?.value === value) {
                    pendingSave.current = null
                }
            }
            setSaving(false)
            autosaveTimer.current = null
        }, 1000)
    }

    const handleSaveAndClose = async () => {
        if (readOnly) {
            onClose()
            return
        }

        // Se houver salvamento pendente, executa agora de forma síncrona/await
        if (pendingSave.current) {
            const { field, value } = pendingSave.current
            // Disparamos o salvamento final antes de fechar
            await autosaveVetConsultation(consultation.id, field, value)
        }
        
        onClose()
    }

    const handleFinish = async () => {
        if (readOnly) return;
        if (consultation.appointment_id) {
            setSaving(true)
            const res = await finishVetConsultation(consultation.appointment_id)
            setSaving(false)
            if (!res.success) {
                alert(res.message)
                return
            }
        }
        onSave?.()
        onClose()
    }

    const handleGeneratePDF = async () => {
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF()

            let petName = consultation.pets?.name
            let tutorName = consultation.pets?.customers?.name || consultation.pets?.customer?.name

            if (!petName || !tutorName) {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                const { data: pet } = await supabase
                    .from('pets')
                    .select('name, customers(name)')
                    .eq('id', formData.pet_id || consultation.pet_id)
                    .single()

                if (pet) {
                    petName = pet.name
                    tutorName = Array.isArray(pet.customers) ? pet.customers[0]?.name : (pet.customers as any)?.name
                }
            }

            petName = petName || 'Desconhecido'
            tutorName = tutorName || 'Desconhecido'

            const dateStr = formData.consultation_date
                ? new Date(formData.consultation_date).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR')

            const vet = vets.find(v => v.id === formData.veterinarian_id) || consultation.veterinarians
            const vetName = vet?.name || 'Veterinário não especificado'
            const vetCrmv = vet?.crmv || 'CRMV não especificado'

            // --- Header com Logo ---
            let yPos = 20
            const orgLogo = await getOrganizationLogo()
            
            if (orgLogo) {
                try {
                    // Adiciona o logo mantendo a proporção (preserveAspectRatio)
                    // Aumentando para 50x30mm para dar mais visibilidade
                    doc.addImage(orgLogo, 'PNG', 105 - 25, yPos, 50, 30, undefined, 'FAST')
                    yPos += 35
                } catch (e) {
                    console.error('Erro ao adicionar logo ao PDF:', e)
                    // Tenta novamente sem especificar formato se falhar
                    try {
                        doc.addImage(orgLogo, 105 - 25, yPos, 50, 30)
                        yPos += 35
                    } catch(e2) {}
                }
            }

            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.text('RECEITUÁRIO VETERINÁRIO', 105, yPos, { align: 'center' })
            yPos += 15

            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text(`Tutor(a): ${tutorName}`, 20, yPos)
            doc.text(`Data: ${dateStr}`, 150, yPos)
            yPos += 10
            doc.text(`Paciente: ${petName}`, 20, yPos)
            yPos += 5

            doc.setLineWidth(0.5)
            doc.line(20, yPos, 190, yPos)
            yPos += 10

            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text('Prescrição:', 20, yPos)
            yPos += 10

            doc.setFont('helvetica', 'normal')
            const prescriptionText = formData.prescription || 'Nenhuma prescrição informada.'
            const splitText = doc.splitTextToSize(prescriptionText, 170)
            doc.text(splitText, 20, yPos)

            const pageHeight = doc.internal.pageSize.height
            doc.line(60, pageHeight - 40, 150, pageHeight - 40)
            doc.setFontSize(10)
            doc.text(`Dr(a). ${vetName}`, 105, pageHeight - 35, { align: 'center' })
            doc.text(`CRMV: ${vetCrmv}`, 105, pageHeight - 30, { align: 'center' })

            doc.save(`Receita_${petName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`)
        } catch (error) {
            console.error('Erro ao gerar PDF:', error)
            alert('Erro ao gerar PDF. Tente novamente.')
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2>🩺 Prontuário de Atendimento {readOnly && '(Somente Leitura)'}</h2>
                        <span className={styles.petName}>Pet: {consultation.pets?.name || 'Carregando...'}</span>
                    </div>
                    <div className={styles.headerActions}>
                        {!readOnly && (
                            <div className={styles.statusInfo}>
                                {saving ? (
                                    <span className={styles.saving}>☁️ Salvando...</span>
                                ) : lastSaved ? (
                                    <span className={styles.saved}>✓ Salvo às {lastSaved.toLocaleTimeString('pt-BR')}</span>
                                ) : null}
                            </div>
                        )}
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
                                disabled={readOnly}
                            >
                                <option value="">Selecione...</option>
                                {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Data da Consulta</label>
                            <DateInput
                                name="consultation_date"
                                value={formData.consultation_date?.split('T')[0] || ''}
                                onChange={(val) => handleFieldChange('consultation_date', val)}
                                className={styles.input}
                                yearRange={[2024, new Date().getFullYear() + 1]}
                                disabled={readOnly}
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
                            disabled={readOnly}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Anamnese (Histórico e Conversa com o Tutor)</label>
                        <textarea
                            value={formData.anamnesis || ''}
                            onChange={(e) => handleFieldChange('anamnesis', e.target.value)}
                            className={styles.textarea}
                            style={{ minHeight: '120px', borderLeft: '4px solid var(--primary)' }}
                            placeholder="Descreva o histórico, sintomas relatados pelo tutor, alimentação, ambiente..."
                            disabled={readOnly}
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
                                disabled={readOnly}
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
                                disabled={readOnly}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ margin: 0 }}>Prescrição Médica / Receita</label>
                            <button className={styles.actionBtn} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={handleGeneratePDF}>
                                🖨️ Gerar PDF
                            </button>
                        </div>
                        <textarea
                            value={formData.prescription || ''}
                            onChange={(e) => handleFieldChange('prescription', e.target.value)}
                            className={styles.textarea}
                            style={{ minHeight: '150px', borderColor: 'var(--primary)', borderWidth: '2px' }}
                            placeholder="Liste os medicamentos, dosagens e horários..."
                            disabled={readOnly}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Observações Internas (Não aparecem na receita)</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            className={styles.textarea}
                            style={{ minHeight: '80px' }}
                            disabled={readOnly}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <BodyMap
                            initialData={formData.body_map_data || []}
                            readOnly={readOnly}
                            species={consultation.pets?.species}
                            onChange={(data) => handleFieldChange('body_map_data', data)}
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
                                disabled={readOnly}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label style={{ margin: 0 }}>Desconto</label>
                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '4px', padding: '1px' }}>
                                    <button 
                                        onClick={() => handleFieldChange('discount_type', 'percent')}
                                        style={{ 
                                            padding: '2px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '3px', cursor: 'pointer',
                                            background: formData.discount_type === 'percent' || !formData.discount_type ? 'white' : 'transparent',
                                            fontWeight: (formData.discount_type === 'percent' || !formData.discount_type) ? 700 : 400
                                        }}>%</button>
                                    <button 
                                        onClick={() => handleFieldChange('discount_type', 'fixed')}
                                        style={{ 
                                            padding: '2px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '3px', cursor: 'pointer',
                                            background: formData.discount_type === 'fixed' ? 'white' : 'transparent',
                                            fontWeight: formData.discount_type === 'fixed' ? 700 : 400
                                        }}>R$</button>
                                </div>
                            </div>
                            {formData.discount_type === 'fixed' ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.discount_fixed || 0}
                                    onChange={(e) => handleFieldChange('discount_fixed', parseFloat(e.target.value))}
                                    className={styles.input}
                                    disabled={readOnly}
                                />
                            ) : (
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.discount_percent || 0}
                                    onChange={(e) => handleFieldChange('discount_percent', parseFloat(e.target.value))}
                                    className={styles.input}
                                    disabled={readOnly}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>💳 Gerenciamento Financeiro</h3>
                        <PaymentManager 
                            refId={consultation.id}
                            refType="consultation"
                            totalDue={calculateFinalTotal()}
                            onStatusChange={(newStatus) => handleFieldChange('payment_status', newStatus)}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    {!readOnly && <p className={styles.hint}>Os dados são salvos automaticamente conforme você digita. ☁️</p>}
                    <div className={styles.footerBtns}>
                        {!readOnly && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {(!nfData && formData.payment_status === 'paid') ? (
                                    <button 
                                        className={styles.nfBtn} 
                                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        onClick={() => setShowNFModal(true)}
                                    >
                                        🧾 Emitir NF
                                    </button>
                                ) : (
                                    <>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: nfData.status === 'autorizado' ? '#059669' : '#d97706',
                                            color: 'white',
                                            fontWeight: 600
                                        }}>
                                            NF: {nfData.status.toUpperCase()}
                                        </div>

                                        {nfData.pdf_url && (
                                            <button 
                                                className={styles.nfBtn} 
                                                style={{ background: '#1e293b', color: '#10b981', border: '1px solid #10b981', padding: '0.6rem 1rem', borderRadius: '6px', fontWeight: 600 }}
                                                onClick={() => window.open(nfData.pdf_url, '_blank')}
                                            >
                                                📄 Ver NF
                                            </button>
                                        )}

                                        {nfData.status === 'autorizado' && (
                                            <button 
                                                className={styles.nfBtn} 
                                                style={{ background: 'transparent', color: '#10b981', border: '1px solid #10b981', padding: '0.6rem 1rem', borderRadius: '6px', fontWeight: 600 }}
                                                onClick={handleSendWhatsApp}
                                            >
                                                📲 Enviar Zap
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        <button className={styles.saveBtn} onClick={handleSaveAndClose}>{readOnly ? 'Fechar' : 'Salvar e Sair'}</button>
                        {!readOnly && <button className={styles.finishBtn} onClick={handleFinish}>Finalizar Consulta</button>}
                    </div>
                </div>

                {showNFModal && (
                    <EmitirNFModal
                        tipo="nfse"
                        origemTipo="atendimento"
                        refId={consultation.id}
                        total_amount={formData.consultation_fee || 0}
                        tutor={{
                            nome: consultation.pets?.customers?.name || 'Cliente não identificado',
                            cpf: consultation.pets?.customers?.cpf_cnpj || consultation.pets?.customers?.cpf || undefined,
                            email: consultation.pets?.customers?.email || undefined,
                            endereco: {
                                logradouro: consultation.pets?.customers?.address || undefined,
                                bairro: consultation.pets?.customers?.neighborhood || undefined,
                                city: consultation.pets?.customers?.city || undefined
                            }
                        }}
                        servico={{
                            descricao: `Consulta Veterinária - Pet: ${consultation.pets?.name}`,
                            valor: formData.consultation_fee || 0
                        }}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={(status) => {
                            alert(`Nota Fiscal solicitada! Status: ${status}`)
                            setShowNFModal(false)
                            // Re-fetch NF status (simplified by reloading modal data or direct fetch)
                            window.location.reload() // Or just setNfData if you prefer a cleaner update
                        }}
                    />
                )}
            </div>
        </div>
    )
}
