'use client'

import { useState } from 'react'

export type DateRange = 'today' | 'week' | 'month'

interface DateRangeFilterProps {
    value: DateRange
    onChange: (range: DateRange) => void
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
                onClick={() => onChange('today')}
                style={{
                    padding: '0.5rem 1rem',
                    background: value === 'today' ? '#2563EB' : '#E5E7EB',
                    color: value === 'today' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: value === 'today' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
            >
                Hoje
            </button>
            <button
                onClick={() => onChange('week')}
                style={{
                    padding: '0.5rem 1rem',
                    background: value === 'week' ? '#2563EB' : '#E5E7EB',
                    color: value === 'week' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: value === 'week' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
            >
                Esta Semana
            </button>
            <button
                onClick={() => onChange('month')}
                style={{
                    padding: '0.5rem 1rem',
                    background: value === 'month' ? '#2563EB' : '#E5E7EB',
                    color: value === 'month' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: value === 'month' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
            >
                Este Mês
            </button>
        </div>
    )
}

/**
 * Helper function to get start/end dates for a given range
 */
export function getDateRange(range: DateRange): { start: Date; end: Date } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (range) {
        case 'today':
            return {
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
            }

        case 'week':
            // Get start of week (Sunday)
            const dayOfWeek = today.getDay()
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - dayOfWeek)
            startOfWeek.setHours(0, 0, 0, 0)

            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)
            endOfWeek.setHours(23, 59, 59, 999)

            return { start: startOfWeek, end: endOfWeek }

        case 'month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

            return { start: startOfMonth, end: endOfMonth }

        default:
            return {
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
            }
    }
}
