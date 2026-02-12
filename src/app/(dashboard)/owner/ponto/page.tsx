'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'

interface TimeEntry {
    id: string
    clock_in: string
    clock_out: string | null
    justification: string | null
    user_id: string
    profiles: {
        full_name: string
        work_start_time: string
    }
}

export default function PontoHistoryPage() {
    const supabase = createClient()
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

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

            const { data, error } = await supabase
                .from('time_entries')
                .select(`
                    *,
                    profiles (
                        full_name,
                        work_start_time
                    )
                `)
                .eq('org_id', profile.org_id)
                .gte('clock_in', `${dateRange.start}T00:00:00`)
                .lte('clock_in', `${dateRange.end}T23:59:59`)
                .order('clock_in', { ascending: false })

            if (error) throw error
            setEntries(data as any)
        } catch (error) {
            console.error('Erro ao buscar histórico de ponto:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase, dateRange])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    const calculateDuration = (start: string, end: string | null) => {
        const startTime = new Date(start).getTime()
        const endTime = end ? new Date(end).getTime() : new Date().getTime()
        const diff = endTime - startTime
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                    <h1 className={styles.title}>⏰ Histórico de Ponto</h1>
                    <p className={styles.subtitle}>Acompanhe as entradas e saídas da sua equipe</p>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>De:</label>
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                </div>
                <div className={styles.filterGroup}>
                    <label>Até:</label>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Carregando histórico...</div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Funcionário</th>
                                <th>Entrada</th>
                                <th>Saída</th>
                                <th>Duração</th>
                                <th>Justificativa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => (
                                <tr key={entry.id}>
                                    <td className={styles.userName}>{entry.profiles?.full_name}</td>
                                    <td>{new Date(entry.clock_in).toLocaleString('pt-BR')}</td>
                                    <td>{entry.clock_out ? new Date(entry.clock_out).toLocaleString('pt-BR') : '---'}</td>
                                    <td className={styles.duration}>{calculateDuration(entry.clock_in, entry.clock_out)}</td>
                                    <td className={styles.justification}>
                                        {entry.justification ? (
                                            <span className={styles.justified} title={entry.justification}>⚠ {entry.justification}</span>
                                        ) : '---'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {entries.length === 0 && <p className={styles.empty}>Nenhum registro encontrado no período.</p>}
                </div>
            )}
        </div>
    )
}
