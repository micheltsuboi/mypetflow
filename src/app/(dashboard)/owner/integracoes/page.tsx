'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { getWhatsAppConfig, saveWhatsAppConfig } from '@/app/actions/integrations'
import ImageUpload from '@/components/ImageUpload'

export default function IntegracoesPage() {
    const [integrationType, setIntegrationType] = useState('system')
    const [apiUrl, setApiUrl] = useState('')
    const [apiToken, setApiToken] = useState('')
    const [clientToken, setClientToken] = useState('')
    const [hasExistingToken, setHasExistingToken] = useState(false)
    const [hasExistingClientToken, setHasExistingClientToken] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [notifications, setNotifications] = useState({
        appointmentConfirmed: true,
        serviceStatus: true,
        reminder24h: true,
        vetAlerts: true
    })
    const router = useRouter()

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await getWhatsAppConfig()
                if (res.success && res.data) {
                    setIntegrationType(res.data.integrationType)
                    setApiUrl(res.data.apiUrl)
                    setHasExistingToken(res.data.hasToken)
                    setHasExistingClientToken(res.data.hasClientToken || false)
                    setLogoUrl(res.data.logoUrl || null)
                    if (res.data.notifications) {
                        setNotifications(res.data.notifications)
                    }
                }
            } catch (err) {
                console.error('Failed to load whatsapp config:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchConfig()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)

        const formData = new FormData()
        formData.append('integration_type', integrationType)
        formData.append('api_url', apiUrl)
        
        // If they left the token blank but there's an existing one, 
        // our server action will ignore the blank update and keep the existing.
        formData.append('api_token', apiToken)
        formData.append('client_token', clientToken)
        formData.append('logo_url', logoUrl || '')
        
        // Notifications
        formData.append('notify_appointment_confirmed', String(notifications.appointmentConfirmed))
        formData.append('notify_service_status', String(notifications.serviceStatus))
        formData.append('notify_reminder_24h', String(notifications.reminder24h))
        formData.append('notify_vet_alerts', String(notifications.vetAlerts))

        const res = await saveWhatsAppConfig(formData)
        
        if (res.success) {
            alert(res.message)
            if (apiToken) {
                setHasExistingToken(true)
                setApiToken('') // Clear it after saving so it doesn't stay plaintext on screen
            }
            if (clientToken) {
                setHasExistingClientToken(true)
                setClientToken('')
            }
        } else {
            alert('Erro: ' + res.error)
        }
        setSaving(false)
    }

    if (loading) return <div className={styles.container}>Carregando configurações...</div>

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Integrações e APIs</h1>
                <p className={styles.subtitle}>Configure como o sistema envia mensagens (WhatsApp) para os seus clientes.</p>
            </header>

            <div className={styles.card}>
                <form onSubmit={handleSubmit}>
                    <div className={styles.radioGroup}>
                        <label className={styles.radioOption}>
                            <input 
                                type="radio" 
                                name="integration_type" 
                                value="system" 
                                checked={integrationType === 'system'} 
                                onChange={(e) => setIntegrationType(e.target.value)}
                                className={styles.radioInput} 
                            />
                            <div className={styles.radioText}>
                                <span className={styles.radioTitle}>Usar WhatsApp Padrão do Sistema</span>
                                <span className={styles.radioDescription}>Os disparos de alertas e notificações são feitos através do número oficial da MyPet Flow.</span>
                            </div>
                            {integrationType === 'system' && <span className={`${styles.statusBadge} ${styles.statusSystem}`}>Ativo</span>}
                        </label>

                        <label className={styles.radioOption}>
                            <input 
                                type="radio" 
                                name="integration_type" 
                                value="custom" 
                                checked={integrationType === 'custom'} 
                                onChange={(e) => setIntegrationType(e.target.value)}
                                className={styles.radioInput} 
                            />
                            <div className={styles.radioText}>
                                <span className={styles.radioTitle}>Usar Meu Próprio WhatsApp (API Customizada)</span>
                                <span className={styles.radioDescription}>Configure a sua URL e Token para realizar disparos através do seu próprio número.</span>
                            </div>
                            {integrationType === 'custom' && <span className={`${styles.statusBadge} ${styles.statusCustom}`}>Ativo</span>}
                        </label>
                    </div>

                    {integrationType === 'custom' && (
                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>URL da API (Webhook POST) *</label>
                                <input 
                                    className={styles.input} 
                                    type="url" 
                                    placeholder="https://sua-api.com/send-text"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    required={integrationType === 'custom'}
                                />
                                <span className={styles.inputInfo}>O sistema enviará um POST com <code>{`{ "phone": "55XX99999999", "message": "texto" }`}</code></span>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Token de Autenticação (Bearer/API Key)</label>
                                <input 
                                    className={styles.input} 
                                    type="password" 
                                    placeholder={hasExistingToken ? "••••••••••••••••" : "Seu token de API"}
                                    value={apiToken}
                                    onChange={(e) => setApiToken(e.target.value)}
                                    required={integrationType === 'custom' && !hasExistingToken}
                                />
                                {hasExistingToken && !apiToken && (
                                    <span className={styles.inputInfo} style={{ color: 'var(--accent-primary)' }}>
                                        Um token já está configurado. Preencha apenas se quiser alterá-lo.
                                    </span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Client-Token (Obrigatório para Z-API)</label>
                                <input 
                                    className={styles.input} 
                                    type="password" 
                                    placeholder={hasExistingClientToken ? "••••••••••••••••" : "Seu Client-Token"}
                                    value={clientToken}
                                    onChange={(e) => setClientToken(e.target.value)}
                                />
                                {hasExistingClientToken && !clientToken && (
                                    <span className={styles.inputInfo} style={{ color: 'var(--accent-primary)' }}>
                                        Client-Token já configurado. Preencha apenas se quiser alterá-lo.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Logo da Clínica / Pet Shop</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Este logo será exibido nos cabeçalhos dos documentos gerados (Receitas, Prontuários, etc).</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ImageUpload 
                                bucket="logos" 
                                url={logoUrl} 
                                onUpload={(url) => setLogoUrl(url)} 
                                onRemove={() => setLogoUrl(null)}
                                label=""
                                isLogo={true}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Preferências de Notificação Automática</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Selecione quais eventos devem disparar mensagens automáticas via WhatsApp.</p>
                        
                        <div className={styles.checkboxList}>
                            <label className={styles.checkboxOption}>
                                <input 
                                    type="checkbox" 
                                    checked={notifications.appointmentConfirmed}
                                    onChange={(e) => setNotifications({...notifications, appointmentConfirmed: e.target.checked})}
                                />
                                <span>Confirmar Novo Agendamento (Ao marcar no calendário)</span>
                            </label>

                            <label className={styles.checkboxOption}>
                                <input 
                                    type="checkbox" 
                                    checked={notifications.serviceStatus}
                                    onChange={(e) => setNotifications({...notifications, serviceStatus: e.target.checked})}
                                />
                                <span>Status de Banho/Serviço (Início e Conclusão)</span>
                            </label>

                            <label className={styles.checkboxOption}>
                                <input 
                                    type="checkbox" 
                                    checked={notifications.reminder24h}
                                    onChange={(e) => setNotifications({...notifications, reminder24h: e.target.checked})}
                                />
                                <span>Lembrete de Agendamento (24h antes)</span>
                            </label>

                            <label className={styles.checkboxOption}>
                                <input 
                                    type="checkbox" 
                                    checked={notifications.vetAlerts}
                                    onChange={(e) => setNotifications({...notifications, vetAlerts: e.target.checked})}
                                />
                                <span>Alertas Veterinários (Vacinas, Vermífugos e Retornos)</span>
                            </label>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </form>
            </div>
        </div>
    )
}
