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
    species?: string
    onChange?: (data: BodyMapPin[]) => void
}

export default function BodyMap({ initialData, readOnly = false, species = 'Cachorro', onChange }: BodyMapProps) {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', fontFamily: 'inherit' }}>
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
                    background: '#0a0a0a',
                    border: '1px solid rgba(140, 180, 201, 0.3)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: readOnly ? 'default' : 'crosshair'
                }}
            >
                {/* Custom Body Map Image based on species */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <img
                        src={(species.toLowerCase().includes('gato') || species.toLowerCase().includes('felin')) ? '/body-map-cat.png' : '/body-map-dog.png'}
                        alt={`Mapeamento Visual - ${species}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            pointerEvents: 'none' // Let clicks pass through to the container
                        }}
                    />
                </div>

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
                                                resize: 'vertical',
                                                fontFamily: 'inherit'
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
