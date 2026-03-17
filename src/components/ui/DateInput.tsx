'use client'

import { useState, useEffect } from 'react'

interface DateInputProps {
    name?: string
    defaultValue?: string | null
    value?: string
    onChange?: (value: string) => void
    className?: string
    style?: React.CSSProperties
    required?: boolean
    disabled?: boolean
    yearRange?: [number, number] // [startYear, endYear]
}

export default function DateInput({
    name,
    defaultValue,
    value,
    onChange,
    className,
    style,
    required = false,
    disabled = false,
    yearRange
}: DateInputProps) {
    // Current date for default ranges
    const currentYear = new Date().getFullYear()
    const startYear = yearRange ? yearRange[0] : 1900
    const endYear = yearRange ? yearRange[1] : currentYear + 10

    // Internal state for non-controlled use
    const [internalYear, setInternalYear] = useState('')
    const [internalMonth, setInternalMonth] = useState('')
    const [internalDay, setInternalDay] = useState('')

    // Initialize internal state from defaultValue
    useEffect(() => {
        if (defaultValue && value === undefined) {
            try {
                const datePart = defaultValue.split('T')[0]
                const parts = datePart.split('-')
                if (parts.length === 3) {
                    setInternalYear(parts[0])
                    setInternalMonth(parts[1])
                    setInternalDay(parts[2])
                }
            } catch (e) {
                console.error('Erro ao processar data:', defaultValue, e)
            }
        }
    }, [defaultValue, value])

    // Helper to get current parts (from props or state)
    const getParts = () => {
        if (value !== undefined) {
            const parts = value.split('-')
            return {
                y: parts[0] || '',
                m: parts[1] || '',
                d: parts[2] || ''
            }
        }
        return {
            y: internalYear,
            m: internalMonth,
            d: internalDay
        }
    }

    const { y, m, d } = getParts()

    const handlePartChange = (part: 'y' | 'm' | 'd', newVal: string) => {
        const parts = { y, m, d, [part]: newVal }
        const formattedDate = (parts.y && parts.m && parts.d)
            ? `${parts.y}-${parts.m.padStart(2, '0')}-${parts.d.padStart(2, '0')}`
            : ''

        if (value !== undefined) {
            onChange?.(formattedDate)
        } else {
            if (part === 'y') setInternalYear(newVal)
            if (part === 'm') setInternalMonth(newVal)
            if (part === 'd') setInternalDay(newVal)
        }
    }

    // Generate options
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i)
    const months = [
        { value: '01', label: 'Jan' },
        { value: '02', label: 'Fev' },
        { value: '03', label: 'Mar' },
        { value: '04', label: 'Abr' },
        { value: '05', label: 'Mai' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Ago' },
        { value: '09', label: 'Set' },
        { value: '10', label: 'Out' },
        { value: '11', label: 'Nov' },
        { value: '12', label: 'Dez' }
    ]
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'))

    const selectStyle = {
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1em',
        paddingRight: '2rem'
    }

    const finalDateStr = (y && m && d) ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : ''

    return (
        <div className={className} style={{ display: 'flex', gap: '0.4rem', width: '100%', ...style }}>
            {name && <input type="hidden" name={name} value={finalDateStr} required={required} />}

            <select
                value={d}
                onChange={(e) => handlePartChange('d', e.target.value)}
                className={className}
                style={{ flex: 1, minWidth: 0, ...selectStyle }}
                required={required}
                disabled={disabled}
            >
                <option value="">Dia</option>
                {days.map(dayVal => <option key={dayVal} value={dayVal}>{dayVal}</option>)}
            </select>

            <select
                value={m}
                onChange={(e) => handlePartChange('m', e.target.value)}
                className={className}
                style={{ flex: 1.2, minWidth: 0, ...selectStyle }}
                required={required}
                disabled={disabled}
            >
                <option value="">Mês</option>
                {months.map(monthObj => <option key={monthObj.value} value={monthObj.value}>{monthObj.label}</option>)}
            </select>

            <select
                value={y}
                onChange={(e) => handlePartChange('y', e.target.value)}
                className={className}
                style={{ flex: 1.5, minWidth: 0, ...selectStyle }}
                required={required}
                disabled={disabled}
            >
                <option value="">Ano</option>
                {years.map(yearVal => <option key={yearVal} value={yearVal.toString()}>{yearVal}</option>)}
            </select>
        </div>
    )
}
