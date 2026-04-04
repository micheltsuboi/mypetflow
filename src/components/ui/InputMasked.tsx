'use client'

import { InputHTMLAttributes } from 'react'

interface InputMaskedProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    mask: (value: string) => string
    onChange: (value: string) => void
    label?: string
    error?: string
}

export default function InputMasked({
    mask,
    onChange,
    label,
    error,
    className,
    value,
    ...props
}: InputMaskedProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = mask(e.target.value)
        onChange(maskedValue)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {label && <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
            <input
                {...props}
                value={value}
                onChange={handleChange}
                className={className}
                autoComplete="off"
            />
            {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
        </div>
    )
}
