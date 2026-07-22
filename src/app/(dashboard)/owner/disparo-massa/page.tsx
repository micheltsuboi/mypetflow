'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { getDisparoConfig, iniciarDisparoMassa } from '@/app/actions/disparo'
import PageHelpModal from '@/components/ui/PageHelpModal'

export default function DisparoMassaPage() {
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [hasPlanFeature, setHasPlanFeature] = useState(false)
    const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false)
    const [contactsCount, setContactsCount] = useState(0)
    const [message, setMessage] = useState('')
    const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await getDisparoConfig()
                if (res.success) {
                    setHasPlanFeature(res.hasDisparoPlanFeature || false)
                    setIsWhatsAppConfigured(res.isWhatsAppConfigured || false)
                    setContactsCount(res.activeContactsCount || 0)
                } else {
                    console.error('Erro ao buscar configurações:', res.error)
                }
            } catch (err) {
                console.error('Falha na comunicação com o servidor:', err)
            } finally {
                setLoading(false)
            }
        }
        loadConfig()
    }, [])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return

        const confirmed = window.confirm(
            `Você tem certeza que deseja iniciar o disparo em massa para os ${contactsCount} clientes elegíveis?`
        )
        if (!confirmed) return

        setSending(true)
        setFeedback(null)

        try {
            const res = await iniciarDisparoMassa(message)
            setFeedback({
                success: res.success,
                message: res.message
            })
            if (res.success) {
                setMessage('') // Limpa a mensagem após iniciar com sucesso
            }
        } catch (err: any) {
            setFeedback({
                success: false,
                message: `Ocorreu um erro no disparo: ${err.message || err}`
            })
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>
                    <div className={styles.spinner}></div>
                    <p>Carregando configurações de disparo...</p>
                </div>
            </div>
        )
    }

    // Caso o cliente não possua o recurso ativado em seu plano SaaS
    if (!hasPlanFeature) {
        return (
            <div className={styles.container}>
                <div className={styles.planFeatureGate}>
                    <div className={styles.gateIcon}>💎</div>
                    <h1 className={styles.gateTitle}>Módulo Bloqueado</h1>
                    <p className={styles.gateText}>
                        O recurso de **Disparo de Mensagens em Massa** não está disponível no seu plano contratado atual.
                    </p>
                    <p className={styles.gateSubtitle}>
                        Entre em contato com o suporte da MyPet Flow para fazer o upgrade do seu plano e liberar esta funcionalidade.
                    </p>
                    <button 
                        onClick={() => router.push('/owner')}
                        className={`btn ${styles.gateBtn}`}
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 className={styles.title}>📢 Disparo em Massa</h1>
                    <PageHelpModal topic="disparo-massa" />
                </div>
                <p className={styles.subtitle}>
                    Envie comunicados, avisos importantes e promoções para toda a sua base de clientes cadastrados de forma prática.
                </p>
            </header>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <form onSubmit={handleSend} className={styles.form}>
                        {/* Estado das configurações de WhatsApp */}
                        {!isWhatsAppConfigured ? (
                            <div className={`${styles.alert} ${styles.alertWarning}`}>
                                <div className={styles.alertHeader}>
                                    <span className={styles.alertIcon}>⚠️</span>
                                    <h3 className={styles.alertTitle}>Integração de WhatsApp Ausente</h3>
                                </div>
                                <p className={styles.alertText}>
                                    Você não configurou uma instância ativa de WhatsApp. É necessário configurar a Z-API nas integrações para que os disparos em massa funcionem.
                                </p>
                                <Link href="/owner/integracoes" className={`btn ${styles.alertBtn}`}>
                                    Configurar WhatsApp / Z-API
                                </Link>
                            </div>
                        ) : (
                            <div className={styles.infoBanner}>
                                <span className={styles.infoIcon}>👥</span>
                                <div className={styles.infoContent}>
                                    <span className={styles.infoTitle}>Clientes Elegíveis</span>
                                    <span className={styles.infoDescription}>
                                        Seu disparo será encaminhado para **{contactsCount}** clientes que possuem telefone celular cadastrado no sistema.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <div className={styles.labelWrapper}>
                                <label className={styles.label}>Escreva sua Mensagem</label>
                                <span className={styles.characterCount}>
                                    Use <code className={styles.code}>{`{nome}`}</code> para personalizar
                                </span>
                            </div>
                            <textarea
                                className={styles.textarea}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Olá {nome}! Passando para avisar que nesta sexta-feira teremos uma promoção especial de banho e tosa para todos os pets cadastrados... 🐾"
                                disabled={!isWhatsAppConfigured || sending}
                                required
                                rows={8}
                            />
                            <p className={styles.tipText}>
                                💡 <strong>Dica de Personalização:</strong> Ao escrever {`{nome}`}, o sistema substituirá automaticamente pelo nome do tutor correspondente ao enviar. Exemplo: <em>"Olá João!..."</em>
                            </p>
                        </div>

                        {feedback && (
                            <div className={`${styles.feedbackBanner} ${feedback.success ? styles.feedbackSuccess : styles.feedbackError}`}>
                                <span className={styles.feedbackIcon}>
                                    {feedback.success ? '✅' : '❌'}
                                </span>
                                <p className={styles.feedbackText}>{feedback.message}</p>
                            </div>
                        )}

                        <div className={styles.actionWrapper}>
                            <button
                                type="submit"
                                className={`btn btn-primary ${styles.submitBtn}`}
                                disabled={!isWhatsAppConfigured || sending || !message.trim() || contactsCount === 0}
                            >
                                {sending ? (
                                    <>
                                        <span className={styles.miniSpinner}></span>
                                        Processando Envio...
                                    </>
                                ) : (
                                    'Iniciar Disparo em Massa 🚀'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.helperCard}>
                    <h3 className={styles.helperTitle}>Recomendações e Políticas</h3>
                    <ul className={styles.helperList}>
                        <li>
                            <span className={styles.helperIcon}>⏳</span>
                            <div className={styles.helperContent}>
                                <strong>Fila Anti-Banimento:</strong> As mensagens são enviadas em segundo plano com um intervalo (delay) de 10 segundos entre cada uma. Isso impede bloqueios por parte do WhatsApp.
                            </div>
                        </li>
                        <li>
                            <span className={styles.helperIcon}>🚪</span>
                            <div className={styles.helperContent}>
                                <strong>Opção de Saída:</strong> Recomendamos sempre encerrar a mensagem oferecendo a opção do cliente pedir para sair da lista. Ex: <em>"Se não quiser receber mais mensagens, responda com SAIR"</em>.
                            </div>
                        </li>
                        <li>
                            <span className={styles.helperIcon}>🔍</span>
                            <div className={styles.helperContent}>
                                <strong>Visualização:</strong> Lembre-se de revisar o texto antes de clicar em disparar. Uma vez iniciado, o processo roda de forma automática e não poderá ser cancelado.
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
