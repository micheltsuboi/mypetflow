'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, HelpCircle, X, Loader2 } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: string
    type?: 'danger' | 'warning' | 'success' | 'info'
    onConfirm: () => Promise<void> | void
    onCancel: () => void
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmColor,
    type = 'warning',
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
    const [isConfirming, setIsConfirming] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setIsConfirming(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleConfirmClick = async () => {
        if (isConfirming) return
        try {
            setIsConfirming(true)
            await onConfirm()
        } catch (error) {
            console.error('[ConfirmationModal] Error in onConfirm:', error)
        } finally {
            setIsConfirming(false)
        }
    }

    const colors = {
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6'
    }

    const icons = {
        danger: <AlertTriangle size={40} color="#EF4444" />,
        warning: <HelpCircle size={40} color="#F59E0B" />,
        success: <HelpCircle size={40} color="#10B981" />,
        info: <HelpCircle size={40} color="#3B82F6" />
    }

    const buttonColor = confirmColor || colors[type]

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 11000, padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: `1px solid var(--card-border)`,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                padding: '2rem',
                position: 'relative',
                color: 'var(--text-primary)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'scaleIn 0.2s ease-out'
            }}>
                <button
                    onClick={onCancel}
                    disabled={isConfirming}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: isConfirming ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '50%',
                        opacity: isConfirming ? 0.4 : 1,
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={e => (!isConfirming && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'))}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icons[type]}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
                            {message}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        onClick={onCancel}
                        disabled={isConfirming}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: isConfirming ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            opacity: isConfirming ? 0.5 : 1,
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={e => (!isConfirming && (e.currentTarget.style.backgroundColor = 'var(--card-hover)'))}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={handleConfirmClick}
                        disabled={isConfirming}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.75rem 1.5rem',
                            background: buttonColor,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: isConfirming ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: `0 4px 14px ${buttonColor}35`,
                            opacity: isConfirming ? 0.8 : 1,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={e => (!isConfirming && (e.currentTarget.style.opacity = '0.9'))}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    >
                        {isConfirming && <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
                        {isConfirming ? (type === 'danger' ? 'Excluindo...' : 'Processando...') : confirmLabel}
                    </button>
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
