'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallbackTitle?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-secondary, #1e293b)',
                    borderRadius: '12px',
                    border: '1px solid var(--border, rgba(255,255,255,0.1))',
                    margin: '2rem auto',
                    maxWidth: '600px',
                    color: 'var(--text-primary, #f8fafc)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                        {this.props.fallbackTitle || 'Ocorreu um problema ao carregar esta visualização'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginBottom: '1.5rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {this.state.error?.message || 'Erro inesperado ao renderizar componente.'}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null })
                            window.location.reload()
                        }}
                        style={{
                            padding: '0.65rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary, #00e4ce)',
                            color: '#0f172a',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Recarregar Página
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
