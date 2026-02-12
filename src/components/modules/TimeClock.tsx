'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './TimeClock.module.css'

interface TimeEntry {
    id: string
    clock_in: string
    clock_out: string | null
    justification: string | null
}

interface UserProfile {
    id: string
    org_id: string
    work_start_time: string
    lunch_start_time: string
    lunch_end_time: string
    work_end_time: string
}

export default function TimeClock() {
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [elapsedTime, setElapsedTime] = useState('')
    const [justification, setJustification] = useState('')
    const [showJustification, setShowJustification] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    const supabase = createClient()

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const fetchTodayEntries = useCallback(async (userId: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('clock_in', today.toISOString())
            .order('clock_in', { ascending: true })

        if (!error && data) {
            setEntries(data)
            const active = data.find(e => !e.clock_out)
            setCurrentEntry(active || null)
        }
    }, [supabase])

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

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsAuthenticated(false)
                    setLoading(false)
                    return
                }

                setIsAuthenticated(true)

                // Fetch Profile and Entries concurrently
                const [profileRes, entriesRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    fetchTodayEntries(user.id)
                ])

                if (profileRes.data) {
                    setProfile(profileRes.data as UserProfile)
                }
            } catch (err) {
                console.error('Error initializing TimeClock:', err)
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [supabase, fetchTodayEntries])

    const checkIfNeedsJustification = () => {
        if (!profile) return false

        const now = currentTime.getHours() * 60 + currentTime.getMinutes()
        const [h, m] = profile.work_start_time.split(':').map(Number)
        const scheduled = h * 60 + m

        // Only for first punch of the day
        if (entries.length === 0 && now > scheduled + 5) { // 5 min tolerance
            return true
        }
        return false
    }

    const handleClockIn = async () => {
        if (checkIfNeedsJustification() && !showJustification) {
            setShowJustification(true)
            return
        }

        setActionLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !profile) return

            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    user_id: user.id,
                    org_id: profile.org_id,
                    clock_in: new Date().toISOString(),
                    justification: justification || null
                })
                .select('*')
                .single()

            if (error) throw error

            setShowJustification(false)
            setJustification('')
            await fetchTodayEntries(user.id)
        } catch (err) {
            console.error('Error clocking in:', err)
            alert('Erro ao bater ponto.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleClockOut = async () => {
        if (!currentEntry) return

        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('time_entries')
                .update({ clock_out: new Date().toISOString() })
                .eq('id', currentEntry.id)

            if (error) throw error

            const { data: { user } } = await supabase.auth.getUser()
            if (user) await fetchTodayEntries(user.id)
        } catch (err) {
            console.error('Error clocking out:', err)
            alert('Erro ao registrar saída.')
        } finally {
            setActionLoading(false)
        }
    }

    const calculateTotalWorked = () => {
        let totalMs = 0
        entries.forEach(entry => {
            const start = new Date(entry.clock_in).getTime()
            const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now()
            totalMs += (end - start)
        })

        const hours = Math.floor(totalMs / (1000 * 60 * 60))
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
        return { hours, minutes, totalMs }
    }

    const worked = calculateTotalWorked()
    const eightHoursMs = 8 * 60 * 60 * 1000
    const overtimeMs = Math.max(0, worked.totalMs - eightHoursMs)
    const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60))
    const overtimeMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60))

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
                <span className={styles.date}>
                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            <div className={styles.clock}>
                <span className={styles.currentTime}>
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            </div>

            {showJustification && (
                <div className={styles.justificationField}>
                    <label>Justificativa de atraso (obrigatória):</label>
                    <textarea
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Explique o motivo do atraso..."
                    />
                </div>
            )}

            {currentEntry ? (
                <div className={styles.activeShift}>
                    <div className={styles.shiftInfo}>
                        <div className={styles.shiftRow}>
                            <span className={styles.label}>Entrada atual:</span>
                            <span className={styles.value}>{new Date(currentEntry.clock_in).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <div className={styles.shiftRow}>
                            <span className={styles.label}>Em serviço:</span>
                            <span className={`${styles.value} ${styles.elapsed}`}>{elapsedTime}</span>
                        </div>
                    </div>
                    <button className={`${styles.button} ${styles.clockOut}`} onClick={handleClockOut} disabled={actionLoading}>
                        {actionLoading ? <div className={styles.buttonSpinner} /> : '🚪 Registrar Saída'}
                    </button>
                </div>
            ) : (
                <div className={styles.noShift}>
                    <button
                        className={`${styles.button} ${styles.clockIn}`}
                        onClick={handleClockIn}
                        disabled={actionLoading || (showJustification && !justification)}
                    >
                        {actionLoading ? <div className={styles.buttonSpinner} /> : '✅ Bater Ponto'}
                    </button>
                    {showJustification && (
                        <button className={styles.cancelBtn} onClick={() => setShowJustification(false)} style={{ marginTop: '0.5rem' }}>
                            Cancelar
                        </button>
                    )}
                </div>
            )}

            <div className={styles.historySection}>
                <div className={styles.historyTitle}>
                    <span>Hoje: {worked.hours}h {worked.minutes}m</span>
                    {overtimeMs > 0 && <span className={styles.overtimeValue}>+{overtimeHours}:${overtimeMinutes.toString().padStart(2, '0')} extra</span>}
                </div>
                <div className={styles.historyList}>
                    {entries.map((entry, idx) => (
                        <div key={entry.id} className={styles.historyItem}>
                            <span className={styles.historyTime}>
                                {idx + 1}º: {new Date(entry.clock_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {entry.clock_out ? ` ➔ ${new Date(entry.clock_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' (Ativo)'}
                            </span>
                            {entry.justification && <span className={styles.statusLate} title={entry.justification}>⚠ Justificado</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
