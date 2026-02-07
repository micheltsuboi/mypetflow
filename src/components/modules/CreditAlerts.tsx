'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './CreditAlerts.module.css'

interface LowCreditAlert {
    credit_id: string
    pet_id: string
    pet_name: string
    customer_name: string
    customer_phone: string | null
    service_type: string
    remaining: number
}

export default function CreditAlerts() {
    const [alerts, setAlerts] = useState<LowCreditAlert[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        async function fetchLowCredits() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // Get user's org_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('org_id')
                    .eq('id', user.id)
                    .single()

                if (!profile?.org_id) {
                    setLoading(false)
                    return
                }

                // Fetch credits with remaining <= 2 and join with pets and customers
                const { data: credits, error } = await supabase
                    .from('service_credits')
                    .select(`
                        id,
                        pet_id,
                        service_type,
                        remaining_quantity,
                        pets!inner (
                            id,
                            name,
                            customers!inner (
                                name,
                                phone_1
                            )
                        )
                    `)
                    .eq('org_id', profile.org_id)
                    .lte('remaining_quantity', 2)
                    .gt('remaining_quantity', 0)
                    .order('remaining_quantity', { ascending: true })

                if (error) {
                    console.error('Error fetching credits:', error)
                    setLoading(false)
                    return
                }

                // Transform data - Supabase returns nested relations
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const transformedAlerts: LowCreditAlert[] = (credits || []).map((credit: any) => {
                    const pet = Array.isArray(credit.pets) ? credit.pets[0] : credit.pets
                    const customer = pet ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers) : null

                    return {
                        credit_id: credit.id,
                        pet_id: credit.pet_id,
                        pet_name: pet?.name || 'Desconhecido',
                        customer_name: customer?.name || 'Desconhecido',
                        customer_phone: customer?.phone_1 || null,
                        service_type: credit.service_type,
                        remaining: credit.remaining_quantity
                    }
                })

                setAlerts(transformedAlerts)
            } catch (err) {
                console.error('Error:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchLowCredits()
    }, [supabase])

    const handleWhatsApp = (phone: string | null, petName: string, serviceType: string, remaining: number) => {
        if (!phone) {
            alert('Cliente não possui telefone cadastrado')
            return
        }

        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

        const message = encodeURIComponent(
            `Olá! 👋\n\n` +
            `Gostaríamos de informar que o pacote de *${serviceType}* do(a) *${petName}* está acabando.\n\n` +
            `📦 Créditos restantes: *${remaining}*\n\n` +
            `Que tal renovar o pacote? Entre em contato conosco para mais informações! 🐾`
        )

        window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank')
    }

    if (loading) {
        return null
    }

    if (alerts.length === 0) {
        return null
    }

    return (
        <div className={styles.container}>
            <button
                className={styles.header}
                onClick={() => setExpanded(!expanded)}
            >
                <div className={styles.headerContent}>
                    <span className={styles.icon}>⚠️</span>
                    <div className={styles.headerText}>
                        <span className={styles.title}>Pacotes Acabando</span>
                        <span className={styles.count}>{alerts.length} alertas</span>
                    </div>
                </div>
                <span className={`${styles.arrow} ${expanded ? styles.expanded : ''}`}>
                    ▼
                </span>
            </button>

            {expanded && (
                <div className={styles.alertsList}>
                    {alerts.map((alert) => (
                        <div key={alert.credit_id} className={styles.alertCard}>
                            <div className={styles.alertInfo}>
                                <div className={styles.petRow}>
                                    <span className={styles.petName}>🐾 {alert.pet_name}</span>
                                    <span className={`${styles.badge} ${alert.remaining === 1 ? styles.critical : styles.warning}`}>
                                        {alert.remaining} {alert.remaining === 1 ? 'restante' : 'restantes'}
                                    </span>
                                </div>
                                <p className={styles.serviceType}>{alert.service_type}</p>
                                <p className={styles.customer}>👤 {alert.customer_name}</p>
                            </div>
                            <button
                                className={styles.whatsappBtn}
                                onClick={() => handleWhatsApp(alert.customer_phone, alert.pet_name, alert.service_type, alert.remaining)}
                            >
                                <span>📱</span>
                                <span>Avisar</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
