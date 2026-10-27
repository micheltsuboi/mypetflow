'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, ExternalLink, X, Check, Loader2, Sparkles } from 'lucide-react'
import { sendManualWhatsApp } from '@/app/actions/whatsapp'
import { maskPhone } from '@/utils/masks'
import { getFirstName } from '@/utils/formatters'

export interface WhatsAppRecipient {
    name?: string
    phone?: string
    petName?: string
    serviceName?: string
    scheduledDate?: string
    scheduledTime?: string
    price?: number
    appointmentId?: string
    customerId?: string
}

interface SendWhatsAppModalProps {
    isOpen: boolean
    onClose: () => void
    recipient: WhatsAppRecipient | null
    onSuccess?: () => void
}

export default function SendWhatsAppModal({
    isOpen,
    onClose,
    recipient,
    onSuccess
}: SendWhatsAppModalProps) {
    const [phone, setPhone] = useState('')
    const [message, setMessage] = useState('')
    const [activeTemplate, setActiveTemplate] = useState<string>('agendamento')
    const [sending, setSending] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Inicializa campos quando modal abre
    useEffect(() => {
        if (isOpen && recipient) {
            setPhone(recipient.phone ? maskPhone(recipient.phone) : '')
            setStatusMessage(null)
            applyTemplate('agendamento', recipient)
        }
    }, [isOpen, recipient])

    if (!isOpen || !recipient) return null

    const pet = recipient.petName || 'seu pet'
    const service = recipient.serviceName || 'atendimento'
    const tutor = getFirstName(recipient.name)
    const date = recipient.scheduledDate || 'data agendada'
    const time = recipient.scheduledTime && recipient.scheduledTime !== 'entrada' ? ` às *${recipient.scheduledTime}*` : ''
    const priceStr = recipient.price ? recipient.price.toFixed(2).replace('.', ',') : '0,00'

    const templates = [
        {
            id: 'agendamento',
            label: '📅 Confirmação',
            getText: () => `📅 *Agendamento Confirmado!*\n\nOlá ${tutor}! Confirmamos o agendamento de *${pet}* para *${service}* no dia *${date}*${time}. Estamos te esperando com muito carinho! 🐶🐾`
        },
        {
            id: 'reagendamento',
            label: '🔄 Reagendamento',
            getText: () => `🔄 *Horário Reagendado!*\n\nOlá ${tutor}! Passando para avisar que o horário do *${pet}* para *${service}* foi atualizado.\n\n📆 Nova Data: *${date}*${time}\n\nQualquer dúvida ou alteração, estamos à disposição! 🐶`
        },
        {
            id: 'pronto',
            label: '🛁 Pronto p/ Retirada',
            getText: () => `🛁 *Pet Pronto para Retirada!*\n\nOlá ${tutor}! O(a) *${pet}* já terminou o serviço de *${service}*, está cheiroso(a) e pronto(a) esperando por você! 🏠 Pode vir buscá-lo(a) quando quiser. 🐾`
        },
        {
            id: 'caminho',
            label: '🚗 A Caminho (Táxi Dog)',
            getText: () => `🚗 *Pet a Caminho!*\n\nOlá ${tutor}! O atendimento do(a) *${pet}* foi finalizado e ele(a) já está a caminho de casa no nosso Táxi Dog! 🚗💨 Prepare os petiscos!`
        },
        {
            id: 'cobranca',
            label: '💰 Pagamento',
            getText: () => `💰 *Lembrete de Pagamento*\n\nOlá ${tutor}! Passando para lembrar sobre o pagamento referente ao atendimento de *${pet}* (*${service}*) no valor de *R$ ${priceStr}*. Qualquer dúvida, estamos à disposição!`
        },
        {
            id: 'livre',
            label: '✍️ Mensagem Livre',
            getText: () => `Olá ${tutor}! `
        }
    ]

    const applyTemplate = (templateId: string, currentRecipient = recipient) => {
        setActiveTemplate(templateId)
        const tpl = templates.find(t => t.id === templateId)
        if (tpl) {
            setMessage(tpl.getText())
        }
    }

    const handleSendDirect = async () => {
        if (!phone.replace(/\D/g, '')) {
            setStatusMessage({ type: 'error', text: 'Informe um número de telefone válido.' })
            return
        }
        if (!message.trim()) {
            setStatusMessage({ type: 'error', text: 'A mensagem não pode ser vazia.' })
            return
        }

        setSending(true)
        setStatusMessage(null)

        try {
            const res = await sendManualWhatsApp({
                phone: phone.replace(/\D/g, ''),
                message,
                petName: recipient.petName,
                serviceName: recipient.serviceName,
                tutorName: recipient.name,
                appointmentId: recipient.appointmentId,
                customerId: recipient.customerId
            })

            if (res.success) {
                setStatusMessage({ type: 'success', text: res.message || 'Mensagem enviada com sucesso!' })
                if (onSuccess) onSuccess()
                setTimeout(() => {
                    onClose()
                }, 1800)
            } else {
                setStatusMessage({ type: 'error', text: res.message || 'Erro ao enviar mensagem.' })
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Erro inesperado ao enviar mensagem.' })
        } finally {
            setSending(false)
        }
    }

    const handleOpenWhatsAppWeb = () => {
        let cleanPhone = phone.replace(/\D/g, '')
        if (!cleanPhone) {
            setStatusMessage({ type: 'error', text: 'Informe o número de telefone.' })
            return
        }
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone
        }
        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 11000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-secondary, #1e293b)',
                border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: 'var(--text-primary, #fff)',
                animation: 'scaleIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    background: 'rgba(37, 211, 102, 0.08)',
                    borderBottom: '1px solid rgba(37, 211, 102, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: '#25D366',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                                Enviar Mensagem via WhatsApp
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: '2px 0 0' }}>
                                Notificação manual e contingência para o tutor
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={sending}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted, #64748b)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '50%'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
                    {/* Dados do Destinatário */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        background: 'var(--bg-tertiary, #0f172a)',
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--card-border, rgba(255,255,255,0.05))'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Tutor / Pet</span>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary, #fff)' }}>
                                {recipient.name || 'Tutor'} {recipient.petName ? `(${recipient.petName})` : ''}
                            </strong>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block', marginBottom: '2px' }}>
                                Telefone (WhatsApp)
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(maskPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border, #334155)',
                                    background: 'var(--bg-secondary, #1e293b)',
                                    color: 'var(--text-primary, #fff)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                }}
                            />
                        </div>
                    </div>

                    {/* Modelos Rápidos */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                            <Sparkles size={14} color="#F59E0B" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                                Modelos Rápidos (Clique para preencher)
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {templates.map(t => {
                                const isSelected = activeTemplate === t.id
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => applyTemplate(t.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: isSelected ? '1px solid #25D366' : '1px solid var(--card-border, #334155)',
                                            background: isSelected ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-tertiary, #0f172a)',
                                            color: isSelected ? '#25D366' : 'var(--text-secondary, #94a3b8)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Campo de Texto da Mensagem */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                                Mensagem a ser enviada
                            </label>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                                {message.length} caracteres
                            </span>
                        </div>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={6}
                            placeholder="Escreva sua mensagem aqui..."
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border, #334155)',
                                background: 'var(--bg-tertiary, #0f172a)',
                                color: 'var(--text-primary, #fff)',
                                fontSize: '0.9rem',
                                lineHeight: '1.45',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Status Alert */}
                    {statusMessage && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            border: `1px solid ${statusMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
                            color: statusMessage.type === 'success' ? '#10B981' : '#EF4444',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {statusMessage.type === 'success' ? <Check size={18} /> : <X size={18} />}
                            {statusMessage.text}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    background: 'var(--bg-tertiary, #0f172a)',
                    borderTop: '1px solid var(--card-border, rgba(255,255,255,0.08))',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                }}>
                    <button
                        type="button"
                        onClick={handleOpenWhatsAppWeb}
                        title="Abre a conversa diretamente no WhatsApp Web ou App"
                        style={{
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(37, 211, 102, 0.4)',
                            background: 'rgba(37, 211, 102, 0.08)',
                            color: '#25D366',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <ExternalLink size={16} />
                        Abrir WhatsApp Web
                    </button>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={sending}
                            style={{
                                padding: '0.65rem 1.25rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border, #334155)',
                                background: 'transparent',
                                color: 'var(--text-secondary, #94a3b8)',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Fechar
                        </button>
                        <button
                            type="button"
                            onClick={handleSendDirect}
                            disabled={sending}
                            style={{
                                padding: '0.65rem 1.4rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#25D366',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                                opacity: sending ? 0.8 : 1
                            }}
                        >
                            {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                            {sending ? 'Disparando...' : 'Enviar pelo Sistema'}
                        </button>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
