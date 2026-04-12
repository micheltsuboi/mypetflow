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
    const getButtonStyle = (buttonValue: DateRange) => ({
        padding: '0.6rem 1.25rem',
        background: value === buttonValue ? 'var(--gradient-primary, #3B82F6)' : 'rgba(255, 255, 255, 0.05)',
        color: value === buttonValue ? 'white' : '#94a3b8',
        border: value === buttonValue ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.9rem',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: value === buttonValue ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => onChange('today')} style={getButtonStyle('today')}>Hoje</button>
                <button onClick={() => onChange('week')} style={getButtonStyle('week')}>Esta Semana</button>
                <button onClick={() => onChange('month')} style={getButtonStyle('month')}>Este Mês</button>
                <button onClick={() => onChange('lastMonth')} style={getButtonStyle('lastMonth')}>Mês Anterior</button>
                <button onClick={() => onChange('all')} style={getButtonStyle('all')}>Todo Período</button>
                <button onClick={() => onChange('custom')} style={getButtonStyle('custom')}>📅 Customizado</button>
            </div>

            {value === 'custom' && onCustomDatesChange && (
                <div style={{ 
                    display: 'flex', 
                    gap: '1.5rem', 
                    alignItems: 'flex-end', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    padding: '1.25rem', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginLeft: '2px' }}>Data Inicial</label>
                        <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={(e) => onCustomDatesChange(e.target.value, customEndDate || '')}
                            style={{ 
                                padding: '0.75rem', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: 'white',
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginLeft: '2px' }}>Data Final</label>
                        <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={(e) => onCustomDatesChange(customStartDate || '', e.target.value)}
                            style={{ 
                                padding: '0.75rem', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: 'white',
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
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
