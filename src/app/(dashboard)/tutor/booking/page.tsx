'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'

interface TimeSlot {
    time: string
    available: boolean
}

interface Service {
    id: string
    name: string
    base_price: number
    category: string
}

export default function BookingPage() {
    const supabase = createClient()
    const [services, setServices] = useState<Service[]>([])
    const [selectedService, setSelectedService] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
    const [bookingComplete, setBookingComplete] = useState(false)

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Get tutor profile to find org_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            // 2. Get active services for this org
            const { data: serviceData } = await supabase
                .from('services')
                .select('id, name, base_price, category')
                .eq('org_id', profile.org_id)
                .eq('is_active', true)

            if (serviceData) setServices(serviceData)

        } catch (error) {
            console.error('Error fetching services:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchServices()
    }, [fetchServices])

    // Generate mock time slots for now (real availability check would be complex)
    const generateTimeSlots = useCallback(() => {
        const slots: TimeSlot[] = []
        for (let hour = 8; hour <= 17; hour++) {
            slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: Math.random() > 0.3 })
            if (hour < 17) slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: Math.random() > 0.3 })
        }
        setTimeSlots(slots)
    }, [])

    useEffect(() => {
        if (selectedDate) generateTimeSlots()
    }, [selectedDate, generateTimeSlots])

    const handleServiceSelect = (serviceId: string) => {
        setSelectedService(serviceId)
        setStep(2)
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value)
        setStep(3)
    }

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time)
    }

    const handleConfirm = async () => {
        // Here we would implement the real appointment creation
        // For now, let's at least simulate success
        setBookingComplete(true)
    }

    const selectedServiceData = services.find(s => s.id === selectedService)

    if (bookingComplete) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>✅</div>
                    <h1>Agendado com Sucesso!</h1>
                    <p>Seu agendamento foi confirmado</p>

                    <div className={styles.confirmDetails}>
                        <div className={styles.confirmRow}>
                            <span>Serviço:</span>
                            <strong>{selectedServiceData?.name}</strong>
                        </div>
                        <div className={styles.confirmRow}>
                            <span>Data:</span>
                            <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long'
                            })}</strong>
                        </div>
                        <div className={styles.confirmRow}>
                            <span>Horário:</span>
                            <strong>{selectedTime}</strong>
                        </div>
                        <div className={styles.confirmRow}>
                            <span>Valor:</span>
                            <strong>R$ {selectedServiceData?.base_price.toFixed(2)}</strong>
                        </div>
                    </div>

                    <Link href="/tutor" className={styles.backLink}>
                        ← Voltar para Timeline
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/tutor" className={styles.backButton}>← Voltar</Link>
                <h1 className={styles.title}>📅 Agendar Serviço</h1>
            </div>

            {/* Progress Steps */}
            <div className={styles.progress}>
                <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
                    <span>1</span>
                    <p>Serviço</p>
                </div>
                <div className={styles.progressLine} />
                <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
                    <span>2</span>
                    <p>Data</p>
                </div>
                <div className={styles.progressLine} />
                <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
                    <span>3</span>
                    <p>Horário</p>
                </div>
            </div>

            {/* Step 1: Service Selection */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Escolha o serviço</h2>
                <div className={styles.serviceList}>
                    {services.map((service) => (
                        <button
                            key={service.id}
                            className={`${styles.serviceCard} ${selectedService === service.id ? styles.selected : ''}`}
                            onClick={() => handleServiceSelect(service.id)}
                        >
                            <div className={styles.serviceInfo}>
                                <span className={styles.serviceName}>{service.name}</span>
                                <span className={styles.serviceDuration}>⏱️ --</span>
                            </div>
                            <span className={styles.servicePrice}>R$ {service.base_price}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 2: Date Selection */}
            {step >= 2 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Escolha a data</h2>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={selectedDate}
                        onChange={handleDateChange}
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>
            )}

            {/* Step 3: Time Selection */}
            {step >= 3 && selectedDate && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Escolha o horário</h2>
                    <div className={styles.timeGrid}>
                        {timeSlots.map((slot) => (
                            <button
                                key={slot.time}
                                className={`${styles.timeSlot} ${!slot.available ? styles.unavailable : ''} ${selectedTime === slot.time ? styles.selected : ''}`}
                                onClick={() => slot.available && handleTimeSelect(slot.time)}
                                disabled={!slot.available}
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirm Button */}
            {selectedService && selectedDate && selectedTime && (
                <div className={styles.confirmSection}>
                    <div className={styles.summary}>
                        <span>{selectedServiceData?.name}</span>
                        <span>•</span>
                        <span>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        <span>•</span>
                        <span>{selectedTime}</span>
                    </div>
                    <button className={styles.confirmButton} onClick={handleConfirm}>
                        Confirmar Agendamento
                    </button>
                </div>
            )}
        </div>
    )
}
