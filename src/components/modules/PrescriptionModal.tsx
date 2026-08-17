'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './PrescriptionModal.module.css'
import { 
    createPrescription, 
    generateNextControlNumber, 
    getOrganizationDetails 
} from '@/app/actions/veterinary'
import { maskCPF } from '@/utils/masks'

interface PrescriptionModalProps {
    pet: any // containing id, name, customers: { name, cpf_cnpj, address, neighborhood, city, cep }
    consultationId?: string | null
    onClose: () => void
    onSave?: () => void
}

export default function PrescriptionModal({ pet, consultationId = null, onClose, onSave }: PrescriptionModalProps) {
    const [vets, setVets] = useState<any[]>([])
    const [selectedVetId, setSelectedVetId] = useState('')
    const [prescriptionText, setPrescriptionText] = useState('')
    const [isControlled, setIsControlled] = useState(false)
    const [controlNumber, setControlNumber] = useState('')
    const [manualControl, setManualControl] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingNumber, setFetchingNumber] = useState(false)

    // Load active veterinarians
    useEffect(() => {
        async function loadVets() {
            try {
                const supabase = createClient()
                const { data } = await supabase
                    .from('veterinarians')
                    .select('id, name, crmv, cpf, user_id, email')
                    .eq('is_active', true)
                
                if (data) {
                    setVets(data)
                    
                    // Auto-select current logged-in veterinarian
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const currentVet = data.find((v: any) => v.user_id === user.id || v.email === user.email)
                        if (currentVet) {
                            setSelectedVetId(currentVet.id)
                        } else if (data.length > 0) {
                            setSelectedVetId(data[0].id)
                        }
                    } else if (data.length > 0) {
                        setSelectedVetId(data[0].id)
                    }
                }
            } catch (err) {
                console.error('Error loading vets:', err)
            }
        }
        loadVets()
    }, [])

    // Manage controlled number generation
    useEffect(() => {
        async function fetchControlNumber() {
            if (isControlled && !manualControl && !controlNumber) {
                try {
                    setFetchingNumber(true)
                    const res = await generateNextControlNumber()
                    if (res.success && res.controlNumber) {
                        setControlNumber(res.controlNumber)
                    }
                } catch (err) {
                    console.error('Error fetching control number:', err)
                } finally {
                    setFetchingNumber(false)
                }
            } else if (!isControlled) {
                setControlNumber('')
            }
        }
        fetchControlNumber()
    }, [isControlled, manualControl])

    const handlePrintPDF = async (ctrlNum: string) => {
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF()
            
            const org = await getOrganizationDetails()
            const vet = vets.find(v => v.id === selectedVetId)
            
            const tutor = pet?.customers || pet?.customer
            const tutorName = tutor?.name || 'Não informado'
            const tutorCpf = tutor?.cpf_cnpj || tutor?.cpf || 'Não informado'
            const tutorAddress = [tutor?.address, tutor?.neighborhood, tutor?.city, tutor?.cep].filter(Boolean).join(', ') || 'Não informado'
            
            const vetName = vet?.name || 'Não informado'
            const vetCrmv = vet?.crmv || 'Não informado'
            const vetCpf = vet?.cpf || 'Não informado'
            
            const vias = isControlled ? [
                "1ª VIA - ESTABELECIMENTO COMERCIAL (RETIDA)",
                "2ª VIA - PROPRIETÁRIO / TUTOR (ORIENTAÇÕES DE USO)",
                "3ª VIA - MÉDICO VETERINÁRIO EMITENTE (ARQUIVO)"
            ] : ["RECEITUÁRIO VETERINÁRIO"]
            
            const dateStr = new Date().toLocaleDateString('pt-BR')
            
            for (let i = 0; i < vias.length; i++) {
                if (i > 0) doc.addPage()
                
                let yPos = 20
                
                // Logo
                if (org?.logo_url) {
                    try {
                        doc.addImage(org.logo_url, 'PNG', 105 - 20, yPos, 40, 24, undefined, 'FAST')
                        yPos += 28
                    } catch (e) {
                        console.error('Logo failed:', e)
                        yPos += 5
                    }
                }
                
                // Header Clinic info
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.text(org?.name || 'Clínica Veterinária', 105, yPos, { align: 'center' })
                yPos += 5
                if (org?.phone) {
                    doc.text(`Telefone: ${org.phone} | Cidade: ${org.city || ''}`, 105, yPos, { align: 'center' })
                    yPos += 5
                }
                if (isControlled && org?.mapa_registration) {
                    doc.text(`Registro MAPA: ${org.mapa_registration}`, 105, yPos, { align: 'center' })
                    yPos += 5
                }
                
                yPos += 5
                doc.setLineWidth(0.5)
                doc.line(20, yPos, 190, yPos)
                yPos += 10
                
                // Title
                doc.setFontSize(isControlled ? 14 : 16)
                doc.setFont('helvetica', 'bold')
                if (isControlled) {
                    doc.text('RECEITUÁRIO DE CONTROLE ESPECIAL', 105, yPos, { align: 'center' })
                    yPos += 6
                    doc.setFontSize(12)
                    doc.text(`Nº CONTROLE: ${ctrlNum}`, 105, yPos, { align: 'center' })
                    yPos += 10
                } else {
                    doc.text('RECEITUÁRIO VETERINÁRIO', 105, yPos, { align: 'center' })
                    yPos += 10
                }
                
                // Patient & Tutor
                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.text('PROPRIETÁRIO / TUTOR:', 20, yPos)
                doc.setFont('helvetica', 'normal')
                doc.text(`${tutorName} (CPF: ${tutorCpf})`, 70, yPos)
                yPos += 6
                
                if (isControlled) {
                    doc.setFont('helvetica', 'bold')
                    doc.text('ENDEREÇO:', 20, yPos)
                    doc.setFont('helvetica', 'normal')
                    const splitAddress = doc.splitTextToSize(tutorAddress, 120)
                    doc.text(splitAddress, 70, yPos)
                    yPos += (splitAddress.length * 5) + 1
                }
                
                doc.setFont('helvetica', 'bold')
                doc.text('ANIMAL:', 20, yPos)
                doc.setFont('helvetica', 'normal')
                doc.text(`${pet?.name || 'Desconhecido'} (${pet?.species || ''} - ${pet?.breed || ''})`, 70, yPos)
                doc.text(`Data: ${dateStr}`, 150, yPos)
                yPos += 10
                
                doc.line(20, yPos, 190, yPos)
                yPos += 10
                
                // Prescription text
                doc.setFontSize(11)
                doc.setFont('helvetica', 'bold')
                doc.text('Prescrição:', 20, yPos)
                yPos += 8
                
                doc.setFont('helvetica', 'normal')
                const splitPresc = doc.splitTextToSize(prescriptionText || 'Nenhuma prescrição informada.', 170)
                doc.text(splitPresc, 20, yPos)
                
                // Footer Signature
                const pageHeight = doc.internal.pageSize.height
                doc.line(60, pageHeight - 35, 150, pageHeight - 35)
                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.text(`Dr(a). ${vetName}`, 105, pageHeight - 30, { align: 'center' })
                doc.setFont('helvetica', 'normal')
                if (isControlled) {
                    doc.text(`CRMV: ${vetCrmv} | CPF: ${vetCpf}`, 105, pageHeight - 25, { align: 'center' })
                } else {
                    doc.text(`CRMV: ${vetCrmv}`, 105, pageHeight - 25, { align: 'center' })
                }
                
                // Stamp Via destination at the bottom
                doc.setFontSize(8)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(120, 120, 120)
                doc.line(20, pageHeight - 15, 190, pageHeight - 15)
                doc.text(vias[i], 105, pageHeight - 10, { align: 'center' })
                doc.setTextColor(0, 0, 0)
            }
            
            doc.save(`Receita_${pet?.name || 'Pet'}_${dateStr.replace(/\s+/g, '_')}.pdf`)
        } catch (e) {
            console.error('Error generating PDF:', e)
            alert('Erro ao gerar PDF.')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVetId) {
            alert('Selecione o médico veterinário emitente.')
            return
        }
        if (!prescriptionText.trim()) {
            alert('Digite a prescrição médica.')
            return
        }

        const tutor = pet?.customers || pet?.customer
        if (isControlled) {
            if (!tutor?.cpf_cnpj && !tutor?.cpf) {
                alert('Atenção: O CPF do Tutor é obrigatório para receitas de controle especial. Atualize o cadastro do tutor.')
                return
            }
            const vet = vets.find(v => v.id === selectedVetId)
            if (!vet?.cpf) {
                alert('Atenção: O CPF do Veterinário é obrigatório para receitas de controle especial. Preencha o CPF do veterinário em seu perfil.')
                return
            }
        }

        try {
            setLoading(true)
            const form = new FormData()
            form.append('pet_id', pet.id)
            form.append('veterinarian_id', selectedVetId)
            if (consultationId) {
                form.append('consultation_id', consultationId)
            }
            form.append('prescription_text', prescriptionText)
            form.append('is_controlled', String(isControlled))
            form.append('control_number', controlNumber)

            const res = await createPrescription(form)
            if (res.success) {
                // Generate and download the PDF
                await handlePrintPDF(controlNumber)
                alert('Receita emitida e salva com sucesso!')
                onSave?.()
                onClose()
            } else {
                alert('Erro ao salvar receita: ' + res.message)
            }
        } catch (err: any) {
            console.error('Error saving prescription:', err)
            alert('Erro inesperado: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <header className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2>Emissão de Receita Médica</h2>
                        <span className={styles.petName}>Paciente: {pet.name} ({pet.species})</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </header>

                <form onSubmit={handleSubmit} className={styles.body}>
                    <div className={styles.formGroup}>
                        <label>Médico Veterinário Emitente</label>
                        <select 
                            className={styles.select}
                            value={selectedVetId}
                            onChange={(e) => setSelectedVetId(e.target.value)}
                            required
                        >
                            <option value="">Selecione o Veterinário...</option>
                            {vets.map(v => (
                                <option key={v.id} value={v.id}>{v.name} (CRMV: {v.crmv})</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Prescrição Médica</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Digite aqui as orientações de uso, medicamentos e posologia..."
                            value={prescriptionText}
                            onChange={(e) => setPrescriptionText(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.checkboxGroup}>
                        <input 
                            type="checkbox"
                            id="isControlled"
                            checked={isControlled}
                            onChange={(e) => {
                                setIsControlled(e.target.checked)
                                if (!e.target.checked) {
                                    setControlNumber('')
                                    setManualControl(false)
                                }
                            }}
                        />
                        <label htmlFor="isControlled">Receituário de Controle Especial (SIPEAGRO/MAPA)</label>
                    </div>

                    {isControlled && (
                        <div className={styles.controlField}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                <input 
                                    type="checkbox"
                                    id="manualControl"
                                    checked={manualControl}
                                    onChange={(e) => {
                                        setManualControl(e.target.checked)
                                        setControlNumber('')
                                    }}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                                <label htmlFor="manualControl" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    Digitar número de controle manualmente
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Número de Controle SIPEAGRO</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder={fetchingNumber ? "Gerando número..." : "Ex: RC-2026-00001"}
                                    value={controlNumber}
                                    onChange={(e) => setControlNumber(e.target.value)}
                                    disabled={!manualControl || fetchingNumber}
                                    required={isControlled}
                                />
                            </div>
                        </div>
                    )}

                </form>

                <footer className={styles.footer}>
                    <div className={styles.footerBtns}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSubmit} className={styles.submitBtn} disabled={loading || fetchingNumber}>
                            {loading ? 'Salvando...' : 'Emitir e Imprimir (PDF)'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}
