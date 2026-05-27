'use client'

import { AlertTriangle, HelpCircle, X } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: string
    type?: 'danger' | 'warning' | 'success' | 'info'
    onConfirm: () => void
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
    if (!isOpen) return null

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
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
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
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--card-hover)')}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: buttonColor,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: `0 4px 14px ${buttonColor}35`,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
            <style jsx global>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
