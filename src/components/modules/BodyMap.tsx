'use client'

import React, { useState, useRef, useEffect } from 'react'

export interface BodyMapPin {
    id: string
    x: number // percentage
    y: number // percentage
    note: string
}

interface BodyMapProps {
    initialData: BodyMapPin[]
    readOnly?: boolean
    onChange?: (data: BodyMapPin[]) => void
}

export default function BodyMap({ initialData, readOnly = false, onChange }: BodyMapProps) {
    const [pins, setPins] = useState<BodyMapPin[]>(initialData || [])
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
    const [noteDraft, setNoteDraft] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync state if initialData changes externally (though rare here)
    useEffect(() => {
        if (JSON.stringify(initialData) !== JSON.stringify(pins)) {
            setPins(initialData || [])
        }
    }, [initialData])

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return

        // If clicking on an existing pin or its popover, don't add a new one
        if ((e.target as HTMLElement).closest('.body-map-pin-bubble') || (e.target as HTMLElement).closest('.body-map-popover')) {
            return
        }

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        const newPin: BodyMapPin = {
            id: Date.now().toString(),
            x,
            y,
            note: ''
        }

        const newPins = [...pins, newPin]
        setPins(newPins)
        setSelectedPinId(newPin.id)
        setNoteDraft('')
        onChange?.(newPins)
    }

    const handlePinClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const pin = pins.find(p => p.id === id)
        if (pin) {
            setSelectedPinId(id)
            setNoteDraft(pin.note)
        }
    }

    const saveNote = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (readOnly || !selectedPinId) return

        const newPins = pins.map(p => {
            if (p.id === selectedPinId) {
                return { ...p, note: noteDraft }
            }
            return p
        })

        setPins(newPins)
        setSelectedPinId(null)
        onChange?.(newPins)
    }

    const deletePin = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (readOnly) return

        const newPins = pins.filter(p => p.id !== id)
        setPins(newPins)
        setSelectedPinId(null)
        onChange?.(newPins)
    }

    const closePopover = () => {
        if (!readOnly && noteDraft !== (pins.find(p => p.id === selectedPinId)?.note || '')) {
            saveNote()
        } else {
            setSelectedPinId(null)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <div style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.5rem 0' }}>
                    Mapeamento Visual (Body Map)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                    {readOnly
                        ? "Passe o mouse ou clique nas marcações para ver as observações clínicas."
                        : "Clique em qualquer região do corpo para adicionar uma marcação e descrever a lesão/dor."}
                </p>
            </div>

            <div
                ref={containerRef}
                onClick={handleMapClick}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto',
                    aspectRatio: '3/4',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(140, 180, 201, 0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: readOnly ? 'default' : 'crosshair'
                }}
            >
                {/* Pet Schematic SVG */}
                <svg viewBox="0 0 300 400" style={{ width: '100%', height: '100%', opacity: 0.6, pointerEvents: 'none' }}>
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#475569" />
                            <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                    </defs>
                    <g stroke="#94a3b8" strokeWidth="2" fill="url(#bodyGradient)">
                        {/* Ears */}
                        <path d="M110 90 Q90 50 120 40 Q130 70 140 80 Z" />
                        <path d="M190 90 Q210 50 180 40 Q170 70 160 80 Z" />
                        {/* Head */}
                        <circle cx="150" cy="100" r="40" />
                        {/* Body */}
                        <ellipse cx="150" cy="220" rx="60" ry="100" />
                        {/* Front Legs */}
                        <rect x="80" y="140" width="25" height="70" rx="10" />
                        <rect x="195" y="140" width="25" height="70" rx="10" />
                        {/* Back Legs */}
                        <rect x="75" y="250" width="25" height="80" rx="10" />
                        <rect x="200" y="250" width="25" height="80" rx="10" />
                        {/* Tail */}
                        <path d="M150 310 Q140 370 160 380" fill="none" strokeWidth="15" strokeLinecap="round" />
                    </g>
                    <text x="150" y="30" fill="#64748b" fontSize="12" textAnchor="middle" fontWeight="bold">VISTA SUPERIOR</text>
                </svg>

                {/* Pins */}
                {pins.map(pin => (
                    <div
                        key={pin.id}
                        className="body-map-pin"
                        style={{
                            position: 'absolute',
                            left: `${pin.x}%`,
                            top: `${pin.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: selectedPinId === pin.id ? 20 : 10
                        }}
                    >
                        {/* Pin Bubble */}
                        <div
                            className="body-map-pin-bubble"
                            onClick={(e) => handlePinClick(e, pin.id)}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: pin.note ? '#ef4444' : '#f59e0b',
                                border: '2px solid white',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: 'transform 0.2s',
                                transform: selectedPinId === pin.id ? 'scale(1.2)' : 'scale(1)'
                            }}
                        >
                            {pins.findIndex(p => p.id === pin.id) + 1}
                        </div>

                        {/* Popover */}
                        {selectedPinId === pin.id && (
                            <div
                                className="body-map-popover"
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginTop: '10px',
                                    background: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    width: '220px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                    zIndex: 30
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                                        Marcação #{pins.findIndex(p => p.id === pin.id) + 1}
                                    </span>
                                    <button onClick={closePopover} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                                        ✕
                                    </button>
                                </div>

                                {readOnly ? (
                                    <div style={{ fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                                        {pin.note || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sem anotação.</span>}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <textarea
                                            autoFocus
                                            value={noteDraft}
                                            onChange={e => setNoteDraft(e.target.value)}
                                            placeholder="Ex: Nódulo de 2cm, móvel..."
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                color: 'white',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                resize: 'vertical'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                            <button
                                                onClick={(e) => deletePin(pin.id, e)}
                                                style={{ padding: '6px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', flex: 1 }}
                                            >
                                                Excluir
                                            </button>
                                            <button
                                                onClick={saveNote}
                                                style={{ padding: '6px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', flex: 1, fontWeight: 'bold' }}
                                            >
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* List pins below map for accessibility/overview */}
            {pins.length > 0 && (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(140, 180, 201, 0.1)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Anotações Salvas:</h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pins.map((pin, index) => (
                            <li key={pin.id} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                                <span style={{ background: pin.note ? '#ef4444' : '#f59e0b', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0 }}>
                                    {index + 1}
                                </span>
                                <span style={{ color: pin.note ? '#f8fafc' : '#64748b', fontStyle: pin.note ? 'normal' : 'italic', wordBreak: 'break-word' }}>
                                    {pin.note || 'Pendente de anotação...'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
