'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInMinutes, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Profile {
    id: string
    full_name: string
    work_start_time: string | null
    work_end_time: string | null
    lunch_start_time: string | null
    lunch_end_time: string | null
}

interface TimeEntry {
    id: string
    clock_in: string
    clock_out: string | null
    justification: string | null
    user_id: string
    profiles: Profile
}

interface DailySummary {
    date: string
    totalMinutes: number
    expectedMinutes: number
    balanceMinutes: number
    entries: TimeEntry[]
    isComplete: boolean
}

interface EmployeeSummary {
    profile: Profile
    days: Record<string, DailySummary>
    totalWorkedMinutes: number
    totalBalanceMinutes: number
}

export default function PontoHistoryPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<Record<string, EmployeeSummary>>({})
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            // 1. Fetch Time Entries
            const { data: entriesData, error } = await supabase
                .from('time_entries')
                .select(`
                    *,
                    profiles (
                        id,
                        full_name,
                        work_start_time,
                        work_end_time,
                        lunch_start_time,
                        lunch_end_time
                    )
                `)
                .eq('org_id', profile.org_id)
                .gte('clock_in', `${startDate}T00:00:00`)
                .lte('clock_in', `${endDate}T23:59:59`)
                .order('clock_in', { ascending: true })

            if (error) throw error

            const entries = entriesData as unknown as TimeEntry[]

            // 2. Process Data
            const employeeMap: Record<string, EmployeeSummary> = {}

            entries.forEach(entry => {
                const profile = entry.profiles
                const userId = entry.user_id
                const dateKey = entry.clock_in.split('T')[0]

                if (!employeeMap[userId]) {
                    employeeMap[userId] = {
                        profile,
                        days: {},
                        totalWorkedMinutes: 0,
                        totalBalanceMinutes: 0
                    }
                }

                if (!employeeMap[userId].days[dateKey]) {
                    // Calculate expected minutes for this day
                    let expected = 480 // Default 8h
                    if (profile.work_start_time && profile.work_end_time) {
                        const start = parseTime(profile.work_start_time)
                        const end = parseTime(profile.work_end_time)
                        let total = end - start

                        if (profile.lunch_start_time && profile.lunch_end_time) {
                            const lStart = parseTime(profile.lunch_start_time)
                            const lEnd = parseTime(profile.lunch_end_time)
                            total -= (lEnd - lStart)
                        }
                        expected = total
                    }

                    employeeMap[userId].days[dateKey] = {
                        date: dateKey,
                        totalMinutes: 0,
                        expectedMinutes: expected,
                        balanceMinutes: 0,
                        entries: [],
                        isComplete: true
                    }
                }

                const day = employeeMap[userId].days[dateKey]
                day.entries.push(entry)

                if (entry.clock_out) {
                    const duration = differenceInMinutes(parseISO(entry.clock_out), parseISO(entry.clock_in))
                    day.totalMinutes += duration
                } else {
                    day.isComplete = false
                }
            })

            // 3. Final Calculations
            Object.values(employeeMap).forEach(emp => {
                Object.values(emp.days).forEach(day => {
                    day.balanceMinutes = day.totalMinutes - day.expectedMinutes
                    emp.totalWorkedMinutes += day.totalMinutes
                    emp.totalBalanceMinutes += day.balanceMinutes
                })
            })

            setEmployees(employeeMap)

        } catch (error) {
            console.error('Erro ao buscar histórico:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase, startDate, endDate])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    // Helper: Parse "HH:mm:ss" to minutes from midnight
    const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number)
        return h * 60 + m
    }

    const formatDuration = (minutes: number) => {
        const h = Math.floor(Math.abs(minutes) / 60)
        const m = Math.abs(minutes) % 60
        const sign = minutes < 0 ? '-' : '' // We might handle negative differently visually
        return `${sign}${h}h ${m}m`
    }

    const getBalanceColor = (minutes: number) => {
        if (minutes > 10) return styles.positive // Green
        if (minutes < -10) return styles.negative // Red
        return styles.neutral // Gray
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                <h1>Relatório de Ponto</h1>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Início:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                    <label>Fim:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                    <label>Funcionário:</label>
                    <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
                        <option value="all">Todos</option>
                        {Object.values(employees).map(emp => (
                            <option key={emp.profile.id} value={emp.profile.id}>{emp.profile.full_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Carregando...</div>
            ) : Object.keys(employees).length === 0 ? (
                <div className={styles.empty}>Nenhum registro encontrado no período.</div>
            ) : (
                <div className={styles.reports}>
                    {Object.values(employees)
                        .filter(emp => selectedEmployeeId === 'all' || emp.profile.id === selectedEmployeeId)
                        .map(emp => (
                            <div key={emp.profile.id} className={styles.employeeCard}>
                                <div className={styles.employeeHeader}>
                                    <h2>{emp.profile.full_name}</h2>
                                    <div className={styles.summaryStats}>
                                        <div className={styles.stat}>
                                            <span>Total Trabalhado</span>
                                            <strong>{formatDuration(emp.totalWorkedMinutes)}</strong>
                                        </div>
                                        <div className={`${styles.stat} ${getBalanceColor(emp.totalBalanceMinutes)}`}>
                                            <span>Saldo (Banco de Horas)</span>
                                            <strong>{emp.totalBalanceMinutes > 0 ? '+' : ''}{formatDuration(emp.totalBalanceMinutes)}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.detailTable}>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Entradas / Saídas</th>
                                                <th>Total</th>
                                                <th>Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.values(emp.days).sort((a, b) => b.date.localeCompare(a.date)).map(day => (
                                                <tr key={day.date}>
                                                    <td>{format(parseISO(day.date), 'dd/MM/yyyy (EEEE)', { locale: ptBR })}</td>
                                                    <td>
                                                        <div className={styles.entriesList}>
                                                            {day.entries.map(entry => (
                                                                <span key={entry.id} className={styles.timePair}>
                                                                    {format(parseISO(entry.clock_in), 'HH:mm')} -
                                                                    {entry.clock_out ? format(parseISO(entry.clock_out), 'HH:mm') : 'Em andamento...'}
                                                                    {entry.justification && <span title={entry.justification}> 📝</span>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td>{formatDuration(day.totalMinutes)}</td>
                                                    <td className={getBalanceColor(day.balanceMinutes)}>
                                                        {day.balanceMinutes > 0 ? '+' : ''}{formatDuration(day.balanceMinutes)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    )
}
