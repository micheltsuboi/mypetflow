'use client'

import React, { useState, useEffect } from 'react'
import styles from './PageHelpModal.module.css'
import { pageHelpData, PageHelpSection } from '@/config/pageHelpData'
import { HelpCircle, X, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react'

interface PageHelpModalProps {
    topic?: string
    customData?: PageHelpSection
    buttonLabel?: string
    style?: React.CSSProperties
    className?: string
}

export default function PageHelpModal({
    topic,
    customData,
    buttonLabel = 'Ajuda',
    style,
    className
}: PageHelpModalProps) {
    const [isOpen, setIsOpen] = useState(false)

    const data: PageHelpSection | undefined = customData || (topic ? pageHelpData[topic] : undefined)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    if (!data) return null

    return (
        <>
            <button
                type="button"
                className={`${styles.helpTrigger} ${className || ''}`}
                onClick={() => setIsOpen(true)}
                title="Clique para entender como funciona esta tela"
                style={style}
            >
                <span className={styles.iconCircle}>?</span>
                <span>{buttonLabel}</span>
            </button>

            {isOpen && (
                <div className={styles.backdrop} onClick={() => setIsOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.header}>
                            <div className={styles.headerTitleWrapper}>
                                {data.categoryBadge && (
                                    <span className={styles.badge}>{data.categoryBadge}</span>
                                )}
                                <h2 className={styles.title}>{data.title}</h2>
                            </div>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setIsOpen(false)}
                                title="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.body}>
                            {/* Descrição Principal */}
                            <div className={styles.descriptionBox}>
                                {data.description}
                            </div>

                            {/* Passo a Passo */}
                            {data.steps && data.steps.length > 0 && (
                                <div className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        <CheckCircle2 size={18} color="#4f46e5" />
                                        Como Funciona (Passo a Passo)
                                    </h3>
                                    <ol className={styles.list}>
                                        {data.steps.map((step, idx) => (
                                            <li key={idx}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Regras Importantes */}
                            {data.rules && data.rules.length > 0 && (
                                <div className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        <AlertCircle size={18} color="#e11d48" />
                                        Regras & Avisos Importantes
                                    </h3>
                                    <ul className={styles.ruleList}>
                                        {data.rules.map((rule, idx) => (
                                            <li key={idx} className={styles.ruleItem}>
                                                <span>⚠️</span>
                                                <span>{rule}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Dicas Práticas */}
                            {data.tips && data.tips.length > 0 && (
                                <div className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        <Lightbulb size={18} color="#16a34a" />
                                        Dicas Práticas
                                    </h3>
                                    <div className={styles.tipsBox}>
                                        {data.tips.map((tip, idx) => (
                                            <div key={idx}>{tip}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.footer}>
                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={() => setIsOpen(false)}
                            >
                                Entendi!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
