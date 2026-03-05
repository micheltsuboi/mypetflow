'use client'

console.log('VET DASH: Arquivo VetAlertsNotification.tsx carregado!')


import { useState, useEffect } from 'react'
import { getPendingVetAlerts, updateVetAlertStatus } from '@/app/actions/veterinary'

export default function VetAlertsNotification() {
    console.log('VET DASH: Componente VetAlertsNotification montando...')
    const [alerts, setAlerts] = useState<any[]>([])

    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    const fetchAlerts = async () => {
        try {
            console.log('VET DASH: Iniciando busca de alertas no frontend...')
            const data = await getPendingVetAlerts()
            console.log('VET DASH: Resposta recebida:', data)
            setAlerts(data || [])
        } catch (error) {
            console.error('VET DASH: Erro ao buscar alertas no component:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAlerts()

        // Polling para checar novos alertas a cada 15s
        const interval = setInterval(fetchAlerts, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleAcknowledge = async (id: string, status: 'read' | 'scheduled') => {
        const res = await updateVetAlertStatus(id, status)
        if (res.success) {
            setAlerts(prev => prev.filter(a => a.id !== id))
        } else {
            alert(res.message)
        }
    }

    // Modificamos para mostrar sempre o botão de alerta (mesmo 0) para teste de visibilidade
    // if (alerts.length === 0 && !loading) {
    //    return null
    // }

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'translateY(10px)' : 'translateY(0)'
                }}
            >
                <div style={{ position: 'relative' }}>
                    <span style={{ fontSize: '1.25rem' }}>🚨</span>
                    <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-12px',
                        background: 'white',
                        color: '#ef4444',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: '900',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {alerts.length}
                    </span>
                </div>
                Alertas Médicos Pendentes
            </button>

            {/* Dropdown / Popover Content */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '0',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    width: '380px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid #1e293b',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#1e293b',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px'
                    }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>Novos Achados Clínicos</h3>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {alerts.map(alert => (
                            <div key={alert.id} style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                borderRadius: '12px',
                                padding: '16px',
                                borderLeft: '6px solid #ef4444'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0, color: '#f87171', fontSize: '1rem', fontWeight: 700 }}>⚠️ Alerta de Saúde</h4>
                                    <span style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>AGUARDANDO ATENDIMENTO</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{alert.pets?.species === 'cat' ? '🐱' : '🐶'}</span>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#f87171', fontSize: '1rem' }}>{alert.pets?.name}</h4>
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>👤 {alert.pets?.customers?.name}</span>
                                    </div>
                                </div>

                                <p style={{
                                    margin: '8px 0 16px',
                                    color: '#e2e8f0',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5,
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #f87171'
                                }}>
                                    "{alert.observation}"
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                        Enviado por: Equipe Operacional
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleAcknowledge(alert.id, 'read')}
                                            style={{
                                                background: '#334155', color: '#e2e8f0', border: 'none',
                                                padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem',
                                                cursor: 'pointer', fontWeight: 600
                                            }}
                                        >
                                            ✅ Ciente
                                        </button>
                                        <button
                                            onClick={() => handleAcknowledge(alert.id, 'scheduled')}
                                            style={{
                                                background: '#2563eb', color: 'white', border: 'none',
                                                padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem',
                                                cursor: 'pointer', fontWeight: 600
                                            }}
                                        >
                                            📅 Em Atendimento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
