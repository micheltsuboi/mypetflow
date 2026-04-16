'use client'

import styles from './AppointmentCard.module.css'
import PaymentControls from '@/components/PaymentControls'

interface AppointmentCardProps {
    appt: any
    viewMode: 'active' | 'history'
    paidMap: Record<string, number>
    nfMap: Record<string, any>
    planFeatures: string[]
    onCheckIn: (id: string) => void
    onCheckOut: (id: string, type?: string) => void
    onDelete: (id: string) => void
    onEdit: (appt: any) => void
    onNFAction?: (appt: any) => void
    onWhatsAppNF?: (ref: string) => void
    onViewReport?: (appt: any) => void
    onStartConsultation?: (appt: any) => void
    isVet?: boolean
    showTime?: boolean
}

export default function AppointmentCard({
    appt,
    viewMode,
    paidMap,
    nfMap,
    planFeatures,
    onCheckIn,
    onCheckOut,
    onDelete,
    onEdit,
    onNFAction,
    onWhatsAppNF,
    onViewReport,
    onStartConsultation,
    isVet,
    showTime = true
}: AppointmentCardProps) {
    const serviceCategory = appt.services?.service_categories
    const categoryColor = serviceCategory?.color || '#3B82F6'
    
    // Check for NF presence
    const nfData = nfMap[appt.id]
    
    return (
        <div
            className={styles.appointmentCard}
            style={{
                borderLeft: `4px solid ${categoryColor}`,
                background: 'var(--bg-secondary)',
                opacity: 1,
                cursor: 'default',
                position: 'relative'
            }}>
            
            {/* Date Badge */}
            <div style={{
                position: 'absolute',
                top: '-12px',
                right: '16px',
                background: categoryColor,
                color: 'white',
                padding: '6px 12px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 1,
                border: '3px solid var(--bg-primary)',
                minWidth: '54px'
            }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>
                    {new Date(appt.scheduled_at).getDate()}
                </span>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px', opacity: 0.95 }}>
                    {new Date(appt.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </span>
            </div>

            <div className={styles.cardTop} style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem', paddingTop: '0.5rem' }}>
                <div className={styles.petInfoMain} style={{ flex: 1, overflow: 'hidden' }}>
                    <div className={styles.petAvatar}>{appt.pets?.species === 'cat' ? '🐱' : '🐶'}</div>
                    <div className={styles.petDetails} style={{ minWidth: 0 }}>
                        <div className={styles.petName} style={{ cursor: 'pointer', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }} onClick={(e) => {
                            e.stopPropagation()
                            onViewReport?.(appt)
                        }}>
                            <span>{appt.pets?.name || 'Pet'}</span>
                            {appt.pets?.is_adapted === false && (
                                <span style={{ fontSize: '0.6rem', padding: '1px 4px', background: '#f1c40f', color: '#000', borderRadius: '4px', fontWeight: 900 }}>
                                    ADAPTAÇÃO
                                </span>
                            )}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <span className={styles.statusBadge} style={{ fontSize: '0.7rem', padding: '2px 8px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {appt.actual_check_in && !appt.actual_check_out ? '🟢 Em Atendimento' :
                                    appt.actual_check_out ? '🏁 Finalizado' :
                                        '⏳ Aguardando'}
                            </span>
                        </div>
                        <div className={styles.tutorName} style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }} onClick={(e) => {
                            e.stopPropagation()
                            onViewReport?.(appt)
                        }}>👤 {appt.pets?.customers?.name || 'Cliente'}</div>

                        {/* Info Row: Time and Service */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.1rem', filter: 'grayscale(0.5)' }}>{appt.services?.service_categories?.icon || '🐕‍🦺'}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{appt.services?.name || 'Serviço'}</span>
                            </div>
                            {showTime && (
                                <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                    🕐 {new Date(new Date(appt.scheduled_at).getTime() + ((appt.is_subscription || appt.is_subscription_session) ? 3 * 60 * 60 * 1000 : 0)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>

                        {/* Session Badge */}
                        {(appt.is_package || appt.package_credit_id) && (
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{
                                    background: (appt.is_subscription || appt.is_subscription_session) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                    color: (appt.is_subscription || appt.is_subscription_session) ? '#10b981' : '#8b5cf6',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    border: `1px solid ${(appt.is_subscription || appt.is_subscription_session) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`
                                }}>
                                    {appt.session_number && appt.total_sessions
                                        ? `${(appt.is_subscription || appt.is_subscription_session) ? '🔄' : '📦'} Sessão ${appt.session_number} de ${appt.total_sessions}`
                                        : `${(appt.is_subscription || appt.is_subscription_session) ? '🔄 ASSINATURA' : '📦 PACOTE'}`}
                                </span>
                            </div>
                        )}

                        <PaymentControls
                            appointmentId={appt.id}
                            calculatedPrice={appt.subscription_price || appt.calculated_price || appt.services?.base_price || null}
                            finalPrice={appt.final_price}
                            discountPercent={appt.discount_percent}
                            discountType={appt.discount_type}
                            discountFixed={appt.discount}
                            paymentStatus={appt.payment_status}
                            paymentMethod={appt.payment_method}
                            isPackage={appt.is_subscription || appt.is_subscription_session || appt.is_package || !!appt.package_credit_id}
                            isSubscription={appt.is_subscription || appt.is_subscription_session}
                            totalPaid={paidMap[appt.id] || 0}
                            onUpdate={(newStatus) => {
                                // Se acabou de pagar COMPLETAMENTE e tem feature de NF, sugerir emitir nota
                                if (newStatus === 'paid' && onNFAction) {
                                    onNFAction(appt)
                                }
                            }}
                            compact
                        />

                        {/* NF Controls */}
                        {appt.payment_status === 'paid' && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                {planFeatures.includes('nota_fiscal') && !nfData ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onNFAction?.(appt)
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 600
                                        }}
                                    >
                                        🧾 Emitir NF
                                    </button>
                                ) : nfData && (
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <a
                                            href={nfData.pdf_url || nfData.caminho_pdf}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: '#10B981',
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                textDecoration: 'none',
                                                fontWeight: 600
                                            }}
                                        >
                                            📄 Ver NF
                                        </a>
                                        {nfData.ref && onWhatsAppNF && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onWhatsAppNF(nfData.ref || nfData.referencia)
                                                }}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: '#25D366',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                💬 WhatsApp
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {viewMode === 'active' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit(appt)
                            }}
                            title="Editar Agendamento"
                            style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            ✏️
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(appt.id)
                            }}
                            title="Excluir Agendamento"
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem'
                            }}
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                {viewMode === 'active' ? (
                    <>
                        {!appt.actual_check_in && !isVet && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCheckIn(appt.id)
                                }}
                                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}>
                                🟢 Iniciar
                            </button>
                        )}
                        
                        {/* Veterinary Consultation Button */}
                        {(isVet || appt.services?.service_categories?.name === 'Clínica Veterinária') && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStartConsultation?.(appt)
                                }}
                                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 2px 4px rgba(59,130,246,0.2)' }}>
                                🩺 Consulta
                            </button>
                        )}

                        {appt.actual_check_in && !appt.actual_check_out && !isVet && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCheckOut(appt.id)
                                }}
                                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#F59E0B', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>
                                📤 Saída
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onViewReport?.(appt)
                        }}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                        📜 Detalhes
                    </button>
                )}
            </div>
        </div>
    )
}
