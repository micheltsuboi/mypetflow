'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, X, Send, Sparkles, MessageSquare } from 'lucide-react'
import styles from './AIAssistantWidget.module.css'

interface AIAssistantWidgetProps {
    user: {
        name: string
        role: string
    }
    pathname: string
}

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function AIAssistantWidget({ user, pathname }: AIAssistantWidgetProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPulse, setShowPulse] = useState(true)
    
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Inicializar conversa e carregar histórico do sessionStorage
    useEffect(() => {
        const savedMessages = sessionStorage.getItem('mypetflow_ai_chat')
        const firstTimePulse = localStorage.getItem('mypetflow_ai_pulse_seen')
        
        if (firstTimePulse) {
            setShowPulse(false)
        }

        if (savedMessages) {
            setMessages(JSON.parse(savedMessages))
        } else {
            // Mensagem de boas-vindas inicial baseada no perfil
            const welcomeMsg = `Olá, **${user.name}**! Eu sou o **Guia MyPet Flow**, seu assistente inteligente. 🐾\n\nEstou aqui para tirar suas dúvidas e te ensinar a usar todas as funcionalidades do sistema. \n\nO que você gostaria de fazer ou aprender a configurar hoje?`
            setMessages([{ role: 'assistant', content: welcomeMsg }])
        }
    }, [user.name])

    // Salvar histórico sempre que mudar
    useEffect(() => {
        if (messages.length > 0) {
            sessionStorage.setItem('mypetflow_ai_chat', JSON.stringify(messages))
        }
    }, [messages])

    // Scroll automático para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    // Gerar sugestões rápidas (Chips) com base no pathname atual
    const getSuggestions = () => {
        const path = pathname || ''
        
        if (path.includes('/owner/services')) {
            return [
                { text: 'Como criar um serviço?', query: 'gostaria de criar um serviço, como faço?' },
                { text: 'O que é checklist de execução?', query: 'como funciona o checklist de execução nos serviços?' },
                { text: 'O que é Matriz de Preço?', query: 'como configurar matriz de preços de serviços?' }
            ]
        }
        if (path.includes('/owner/packages')) {
            return [
                { text: 'Como criar um pacote?', query: 'como faço para criar um pacote de serviços?' },
                { text: 'Como contratar para o pet?', query: 'como vincular e contratar um pacote para o pet?' },
                { text: 'Tipos de validade do pacote', query: 'quais são as regras de validade semanal ou mensal dos pacotes?' }
            ]
        }
        if (path.includes('/owner/agenda')) {
            return [
                { text: 'Como fazer agendamento rápido?', query: 'como agendar atendimento rápido na agenda?' },
                { text: 'Como arrastar agendamentos?', query: 'consigo arrastar e soltar para reagendar?' },
                { text: 'Diferença de visões de agenda', query: 'como alternar entre as visões de lista, dia e semana?' }
            ]
        }
        if (path.includes('/owner/financeiro')) {
            return [
                { text: 'Como lançar despesa?', query: 'como faço para lançar uma conta a pagar ou despesa?' },
                { text: 'Como fechar fluxo de caixa?', query: 'como funciona o controle de fluxo de caixa e baixas?' },
                { text: 'Vendas automáticas no caixa', query: 'as vendas do petshop entram automaticamente no financeiro?' }
            ]
        }
        if (path.includes('/owner/banho-tosa')) {
            return [
                { text: 'Como usar o Kanban?', query: 'como movimentar os pets no painel de banho e tosa?' },
                { text: 'Aviso de pet pronto', query: 'como funciona o aviso de pet pronto automático para o tutor?' },
                { text: 'Diário de bordo', query: 'como enviar fotos e checklist pelo diário de bordo?' }
            ]
        }
        if (path.includes('/owner/creche')) {
            return [
                { text: 'Como fazer check-in?', query: 'como funciona o check-in e check-out da creche?' },
                { text: 'O que é relatório diário?', query: 'como enviar o relatório diário comportamental da creche?' }
            ]
        }
        if (path.includes('/owner/hospedagem')) {
            return [
                { text: 'Como reservar quarto?', query: 'como faço para reservar uma baia ou quarto na hospedagem?' },
                { text: 'Controle de diárias', query: 'como o sistema calcula o valor de diárias do hotel pet?' }
            ]
        }
        if (path.includes('/owner/tutors')) {
            return [
                { text: 'Como cadastrar tutor?', query: 'como cadastrar um tutor no sistema?' },
                { text: 'Como ver saldo de cashback?', query: 'onde vejo e como uso o saldo de cashback do tutor?' }
            ]
        }
        if (path.includes('/owner/pets')) {
            return [
                { text: 'Como criar prontuário?', query: 'como cadastrar um pet e acessar seu prontuário?' },
                { text: 'Vincular tutor ao pet', query: 'todo pet precisa ter um tutor vinculado?' }
            ]
        }
        if (path.includes('/owner/vacinas')) {
            return [
                { text: 'Como registrar vacina?', query: 'como registrar aplicação de vacina e data de reforço?' },
                { text: 'Lembrete de vacina', query: 'o sistema avisa sobre vacinas a vencer?' }
            ]
        }
        if (path.includes('/owner/integracoes')) {
            return [
                { text: 'Conectar WhatsApp', query: 'como conectar meu whatsapp para envio de mensagens automáticas?' },
                { text: 'Gatilhos de mensagens', query: 'quais mensagens são enviadas automaticamente para o tutor?' }
            ]
        }
        if (path.includes('/owner/laboratorio')) {
            return [
                { text: 'Como solicitar exames?', query: 'como solicitar um exame laboratorial para o pet?' },
                { text: 'Como preencher laudo?', query: 'como laudar exames e gerar pdf dos resultados?' }
            ]
        }

        // Sugestões padrão se não encaixar em nenhuma tela específica
        return [
            { text: 'Como criar um serviço?', query: 'gostaria de criar um serviço, como faço?' },
            { text: 'Como criar um pacote?', query: 'como faço para criar um pacote de serviços?' },
            { text: 'Como agendar banho?', query: 'como faço um agendamento de banho e tosa?' },
            { text: 'Como ver fluxo de caixa?', query: 'como acompanho o faturamento e o financeiro?' }
        ]
    }

    const handleOpenToggle = () => {
        setIsOpen(!isOpen)
        if (showPulse) {
            setShowPulse(false)
            localStorage.setItem('mypetflow_ai_pulse_seen', 'true')
        }
    }

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return

        const userMessage: Message = { role: 'user', content: text }
        const updatedMessages = [...messages, userMessage]
        
        setMessages(updatedMessages)
        setInputValue('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: updatedMessages,
                    pathname: pathname
                })
            })

            if (!response.ok) {
                throw new Error('Erro na comunicação com o assistente.')
            }

            const data = await response.json()
            
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: data.content }
            ])
        } catch (error) {
            console.error(error)
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Ops, tive um problema para processar sua pergunta. Por favor, tente novamente em instantes.' }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    // Miniparser de Markdown nativo do react
    const parseInline = (text: string) => {
        // Regex para capturar links: [Texto](/rota) e negritos: **texto**
        const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g
        const parts = text.split(regex)

        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>
            }
            if (part.startsWith('[') && part.includes('](')) {
                const labelEnd = part.indexOf(']')
                const urlStart = part.indexOf('](') + 2
                const urlEnd = part.length - 1
                const label = part.slice(1, labelEnd)
                const url = part.slice(urlStart, urlEnd)

                // Interceptar navegação interna no Next.js
                if (url.startsWith('/')) {
                    return (
                        <a
                            key={index}
                            href={url}
                            onClick={(e) => {
                                e.preventDefault()
                                router.push(url)
                                // Opcional: fechar o chat no mobile para não cobrir a tela
                                if (window.innerWidth <= 480) {
                                    setIsOpen(false)
                                }
                            }}
                        >
                            {label}
                        </a>
                    )
                }

                return (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                        {label}
                    </a>
                )
            }
            return part
        })
    }

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n')
        let inList = false
        const renderedElements: React.ReactNode[] = []

        lines.forEach((line, idx) => {
            const trimmed = line.trim()

            // Fechar lista se a linha não for item de lista
            if (inList && !trimmed.startsWith('-')) {
                inList = false
            }

            // Título H3 (###)
            if (trimmed.startsWith('### ')) {
                renderedElements.push(<h3 key={idx}>{parseInline(trimmed.replace('### ', ''))}</h3>)
                return
            }

            // Título H4 (####)
            if (trimmed.startsWith('#### ')) {
                renderedElements.push(<h4 key={idx}>{parseInline(trimmed.replace('#### ', ''))}</h4>)
                return
            }

            // Item de Lista (- )
            if (trimmed.startsWith('- ')) {
                renderedElements.push(<li key={idx}>{parseInline(trimmed.replace('- ', ''))}</li>)
                inList = true
                return
            }

            // Espaço vazio
            if (trimmed === '') {
                renderedElements.push(<div key={idx} style={{ height: '8px' }} />)
                return
            }

            // Parágrafo padrão
            renderedElements.push(<p key={idx}>{parseInline(line)}</p>)
        })

        return renderedElements
    }

    return (
        <>
            {/* Trigger Button flutuante */}
            <button 
                type="button"
                className={styles.assistantTrigger}
                onClick={handleOpenToggle}
                title="Dúvidas sobre o sistema? Fale com o Guia!"
            >
                {isOpen ? <X size={26} /> : <Bot size={28} />}
                {showPulse && <span className={styles.pulseEffect} />}
            </button>

            {/* Chatbox Popover */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    {/* Header */}
                    <div className={styles.chatHeader}>
                        <div className={styles.headerTitleWrapper}>
                            <Bot size={22} />
                            <div className={styles.headerInfo}>
                                <h2 className={styles.chatTitle}>Guia MyPet Flow</h2>
                                <span className={styles.chatStatus}>
                                    <span className={styles.statusDot} />
                                    Online
                                </span>
                            </div>
                        </div>
                        <button 
                            type="button"
                            className={styles.closeButton}
                            onClick={() => setIsOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className={styles.messageArea}>
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`${styles.messageRow} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}
                            >
                                <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                                    {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`${styles.messageRow} ${styles.rowAssistant}`}>
                                <div className={`${styles.messageBubble} ${styles.bubbleAssistant}`}>
                                    <div className={styles.typingIndicator}>
                                        <span className={styles.typingDot} />
                                        <span className={styles.typingDot} />
                                        <span className={styles.typingDot} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Sugestões Rápidas */}
                    {!isLoading && getSuggestions().length > 0 && (
                        <div className={styles.suggestionsContainer}>
                            {getSuggestions().map((sug, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={styles.suggestionChip}
                                    onClick={() => handleSendMessage(sug.query)}
                                >
                                    {sug.text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Chat Input */}
                    <form 
                        className={styles.inputForm}
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleSendMessage(inputValue)
                        }}
                    >
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Como faço para..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={!inputValue.trim() || isLoading}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </>
    )
}
