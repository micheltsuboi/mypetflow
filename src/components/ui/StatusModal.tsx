'use client'

import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

export type StatusModalType = 'success' | 'error' | 'warning' | 'info'

interface StatusModalProps {
    type: StatusModalType
    title: string
    message: string
    onClose: () => void
}

export default function StatusModal({ type, title, message, onClose }: StatusModalProps) {
    const icons = {
        success: <CheckCircle2 size={48} color="#10B981" />,
        error: <XCircle size={48} color="#EF4444" />,
        warning: <AlertTriangle size={48} color="#F59E0B" />,
        info: <Info size={48} color="#3B82F6" />
    }

    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: `1px solid var(--card-border)`,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-primary)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    {icons[type]}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    {message}
                </p>
                <button 
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '0.8rem',
                        background: colors[type],
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}
