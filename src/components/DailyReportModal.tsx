'use client'

import { useState, useEffect } from 'react'
import { uploadReportPhoto, saveDailyReport, getDailyReport } from '@/app/actions/dailyReport'

interface DailyReportModalProps {
    appointmentId: string
    petName: string
    serviceName: string
    onClose: () => void
    onSave: () => void
}

export default function DailyReportModal({
    appointmentId,
    petName,
    serviceName,
    onClose,
    onSave
}: DailyReportModalProps) {
    const [reportText, setReportText] = useState('')
    const [photos, setPhotos] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Load existing report on mount
    useEffect(() => {
        const loadReport = async () => {
            const report = await getDailyReport(appointmentId)
            if (report) {
                setReportText(report.report_text || '')
                setPhotos(report.photos || [])
            }
        }
        loadReport()
    }, [appointmentId])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)

        for (const file of Array.from(files)) {
            const formData = new FormData()
            formData.append('file', file)

            const result = await uploadReportPhoto(formData)
            if (result.success && result.url) {
                setPhotos(prev => [...prev, result.url!])
            } else {
                alert(result.message || 'Erro ao fazer upload da foto')
            }
        }

        setUploading(false)
    }

    const handleDeletePhoto = (photoUrl: string) => {
        if (confirm('Deletar esta foto?')) {
            setPhotos(prev => prev.filter(url => url !== photoUrl))
        }
    }

    const handleSave = async () => {
        if (!reportText.trim() && photos.length === 0) {
            alert('Adicione pelo menos um texto ou foto')
            return
        }

        setSaving(true)
        const result = await saveDailyReport(appointmentId, reportText, photos)
        setSaving(false)

        if (result.success) {
            alert(result.message)
            onSave()
            onClose()
        } else {
            alert(result.message)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>
                            Relatório do Dia
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {petName} • {serviceName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Text Area */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            Atividades do Dia
                        </label>
                        <textarea
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Descreva o que o pet fez durante o dia: brincadeiras, alimentação, comportamento, etc."
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '0.75rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            Fotos do Dia
                        </label>

                        {/* Upload Button */}
                        <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: '#2563EB',
                            color: 'white',
                            borderRadius: '8px',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            opacity: uploading ? 0.6 : 1
                        }}>
                            {uploading ? '⏳ Enviando...' : '📸 Adicionar Fotos'}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {/* Photo Gallery */}
                        {photos.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: '1rem',
                                marginTop: '1rem'
                            }}>
                                {photos.map((photoUrl, index) => (
                                    <div key={index} style={{ position: 'relative' }}>
                                        <img
                                            src={photoUrl}
                                            alt={`Foto ${index + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '120px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)'
                                            }}
                                        />
                                        <button
                                            onClick={() => handleDeletePhoto(photoUrl)}
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                background: 'rgba(239, 68, 68, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: '#10B981',
                            color: 'white',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            opacity: saving ? 0.6 : 1
                        }}
                    >
                        {saving ? 'Salvando...' : 'Salvar Relatório'}
                    </button>
                </div>
            </div>
        </div>
    )
}
