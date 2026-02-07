'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './TimeClock.module.css'

interface TimeEntry {
    id: string
    clock_in: string
    clock_out: string | null
}

export default function TimeClock() {
    const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [elapsedTime, setElapsedTime] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [demoMode, setDemoMode] = useState(false)
    const supabase = createClient()

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Calculate elapsed time when clocked in
    useEffect(() => {
        if (!currentEntry) {
            setElapsedTime('')
            return
        }

        const calculateElapsed = () => {
            const clockIn = new Date(currentEntry.clock_in)
            const now = new Date()
            const diff = now.getTime() - clockIn.getTime()

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setElapsedTime(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            )
        }

        calculateElapsed()
        const timer = setInterval(calculateElapsed, 1000)
        return () => clearInterval(timer)
    }, [currentEntry])

    // Fetch current active time entry
    useEffect(() => {
        async function fetchActiveEntry() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsAuthenticated(false)
                    setLoading(false)
                    return
                }

                setIsAuthenticated(true)

                const { data, error } = await supabase
                    .from('time_entries')
                    .select('id, clock_in, clock_out')
                    .eq('user_id', user.id)
                    .is('clock_out', null)
                    .order('clock_in', { ascending: false })
                    .limit(1)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching time entry:', error)
                }

                setCurrentEntry(data || null)
            } catch (err) {
                console.error('Error:', err)
                setIsAuthenticated(false)
            } finally {
                setLoading(false)
            }
        }

        fetchActiveEntry()
    }, [supabase])

    const handleClockIn = async () => {
        // Demo mode - works without authentication
        if (!isAuthenticated || demoMode) {
            setCurrentEntry({
                id: 'demo-' + Date.now(),
                clock_in: new Date().toISOString(),
                clock_out: null
            })
            setDemoMode(true)
            return
        }

        setActionLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get user's org_id from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) {
                alert('Usuário sem organização vinculada')
                return
            }

            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    user_id: user.id,
                    org_id: profile.org_id,
                    clock_in: new Date().toISOString()
                })
                .select('id, clock_in, clock_out')
                .single()

            if (error) throw error
            setCurrentEntry(data)
        } catch (err) {
            console.error('Error clocking in:', err)
            alert('Erro ao bater ponto. Tente novamente.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleClockOut = async () => {
        if (!currentEntry) return

        // Demo mode - works without authentication
        if (demoMode) {
            setCurrentEntry(null)
            return
        }

        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('time_entries')
                .update({ clock_out: new Date().toISOString() })
                .eq('id', currentEntry.id)

            if (error) throw error
            setCurrentEntry(null)
        } catch (err) {
            console.error('Error clocking out:', err)
            alert('Erro ao registrar saída. Tente novamente.')
        } finally {
            setActionLoading(false)
        }
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>⏰ Controle de Ponto</h3>
                <span className={styles.date}>{formatDate(currentTime)}</span>
            </div>

            {demoMode && (
                <div className={styles.demoAlert}>
                    🎮 Modo Demo - Dados não são salvos
                </div>
            )}

            <div className={styles.clock}>
                <span className={styles.currentTime}>{formatTime(currentTime)}</span>
            </div>

            {currentEntry ? (
                <div className={styles.activeShift}>
                    <div className={styles.shiftInfo}>
                        <div className={styles.shiftRow}>
                            <span className={styles.label}>Entrada:</span>
                            <span className={styles.value}>
                                {new Date(currentEntry.clock_in).toLocaleTimeString('pt-BR')}
                            </span>
                        </div>
                        <div className={styles.shiftRow}>
                            <span className={styles.label}>Tempo trabalhado:</span>
                            <span className={`${styles.value} ${styles.elapsed}`}>
                                {elapsedTime}
                            </span>
                        </div>
                    </div>
                    <button
                        className={`${styles.button} ${styles.clockOut}`}
                        onClick={handleClockOut}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <span className={styles.buttonSpinner} />
                        ) : (
                            <>🚪 Registrar Saída</>
                        )}
                    </button>
                </div>
            ) : (
                <div className={styles.noShift}>
                    <p className={styles.message}>Você não está com o ponto aberto.</p>
                    <button
                        className={`${styles.button} ${styles.clockIn}`}
                        onClick={handleClockIn}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <span className={styles.buttonSpinner} />
                        ) : (
                            <>✅ Bater Ponto de Entrada</>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
