'use client'

import { useState } from 'react'

export type DateRange = 'today' | 'week' | 'month' | 'lastMonth' | 'all' | 'custom'

interface DateRangeFilterProps {
    value: DateRange
    onChange: (range: DateRange) => void
    customStartDate?: string
    customEndDate?: string
    onCustomDatesChange?: (start: string, end: string) => void
}

export default function DateRangeFilter({ 
    value, 
    onChange,
    customStartDate,
    customEndDate,
    onCustomDatesChange 
}: DateRangeFilterProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                <button
                    onClick={() => onChange('lastMonth')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: value === 'lastMonth' ? '#2563EB' : '#E5E7EB',
                        color: value === 'lastMonth' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: value === 'lastMonth' ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    Mês Anterior
                </button>
                <button
                    onClick={() => onChange('all')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: value === 'all' ? '#2563EB' : '#E5E7EB',
                        color: value === 'all' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: value === 'all' ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    Tudo
                </button>
                <button
                    onClick={() => onChange('custom')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: value === 'custom' ? '#2563EB' : '#E5E7EB',
                        color: value === 'custom' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: value === 'custom' ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    Customizado
                </button>
            </div>

            {value === 'custom' && onCustomDatesChange && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Início</label>
                        <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={(e) => onCustomDatesChange(e.target.value, customEndDate || '')}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Fim</label>
                        <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={(e) => onCustomDatesChange(customStartDate || '', e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * Helper function to get start/end dates for a given range
 */
export function getDateRange(range: DateRange, customStart?: string, customEnd?: string): { start: Date; end: Date } {
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

        case 'lastMonth':
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0)
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
            return { start: startOfLastMonth, end: endOfLastMonth }

        case 'all':
            return {
                start: new Date(2000, 0, 1, 0, 0, 0),
                end: new Date(2100, 0, 1, 23, 59, 59)
            }

        case 'custom':
            if (customStart && customEnd) {
                const s = new Date(customStart + 'T00:00:00')
                const e = new Date(customEnd + 'T23:59:59')
                return { start: s, end: e }
            }
            // Fallback to month if custom dates are missing
            return getDateRange('month')

        default:
            return {
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
            }
    }
}
