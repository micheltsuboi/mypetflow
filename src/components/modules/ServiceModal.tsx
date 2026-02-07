'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './ServiceModal.module.css'

interface ChecklistItem {
    id: string
    label: string
    checked: boolean
}

interface AppointmentBasic {
    id: string
    pet_id: string
    pet_name: string
    service_name: string
    customer_name: string
    notes: string | null
}

interface ServiceModalProps {
    appointment: AppointmentBasic | null
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

const defaultChecklist: ChecklistItem[] = [
    { id: '1', label: 'Recepção do pet', checked: false },
    { id: '2', label: 'Verificar condições de saúde', checked: false },
    { id: '3', label: 'Escovação inicial', checked: false },
    { id: '4', label: 'Banho com shampoo adequado', checked: false },
    { id: '5', label: 'Condicionador aplicado', checked: false },
    { id: '6', label: 'Secagem completa', checked: false },
    { id: '7', label: 'Corte de unhas', checked: false },
    { id: '8', label: 'Limpeza de ouvidos', checked: false },
    { id: '9', label: 'Perfume (se autorizado)', checked: false },
    { id: '10', label: 'Foto final', checked: false },
]

export default function ServiceModal({ appointment, isOpen, onClose, onComplete }: ServiceModalProps) {
    const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist)
    const [observation, setObservation] = useState('')
    const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const handleCheckItem = (id: string) => {
        setChecklist(prev =>
            prev.map(item =>
                item.id === id ? { ...item, checked: !item.checked } : item
            )
        )
    }

    const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        const newPhotos = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }))

        setPhotos(prev => [...prev, ...newPhotos])
    }, [])

    const removePhoto = (index: number) => {
        setPhotos(prev => {
            const updated = [...prev]
            URL.revokeObjectURL(updated[index].preview)
            updated.splice(index, 1)
            return updated
        })
    }

    const uploadPhotos = async (): Promise<string[]> => {
        if (photos.length === 0 || !appointment) return []

        const uploadedUrls: string[] = []

        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i]
            setUploadProgress(`Enviando foto ${i + 1} de ${photos.length}...`)

            const filename = `${appointment.pet_id}/${Date.now()}-${i}.${photo.file.name.split('.').pop()}`

            const { error } = await supabase.storage
                .from('pet-photos')
                .upload(filename, photo.file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (error) {
                console.error('Upload error:', error)
                continue
            }

            const { data: urlData } = supabase.storage
                .from('pet-photos')
                .getPublicUrl(filename)

            if (urlData) {
                uploadedUrls.push(urlData.publicUrl)
            }
        }

        return uploadedUrls
    }

    const handleComplete = async () => {
        if (!appointment) return

        setUploading(true)
        try {
            // Upload photos
            const photoUrls = await uploadPhotos()

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user?.id)
                .single()

            // Save daily reports for each photo
            for (const photoUrl of photoUrls) {
                await supabase.from('daily_reports').insert({
                    appointment_id: appointment.id,
                    pet_id: appointment.pet_id,
                    staff_id: user?.id,
                    org_id: profile?.org_id,
                    photo_url: photoUrl,
                    observation: observation || null,
                    report_type: 'photo',
                    is_public: true
                })
            }

            // Update appointment with checklist and mark as done
            await supabase
                .from('appointments')
                .update({
                    checklist: checklist,
                    notes: observation || null,
                    status: 'done',
                    completed_at: new Date().toISOString()
                })
                .eq('id', appointment.id)

            // Reset state
            setChecklist(defaultChecklist)
            setObservation('')
            setPhotos([])
            setUploadProgress('')

            onComplete()
            onClose()
        } catch (err) {
            console.error('Error completing service:', err)
            alert('Erro ao finalizar atendimento. Tente novamente.')
        } finally {
            setUploading(false)
        }
    }

    const completedCount = checklist.filter(i => i.checked).length
    const progress = (completedCount / checklist.length) * 100

    if (!isOpen || !appointment) return null

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.title}>Atendimento</h2>
                        <p className={styles.subtitle}>
                            🐾 {appointment.pet_name} • {appointment.service_name}
                        </p>
                        <p className={styles.customer}>👤 {appointment.customer_name}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.content}>
                    {/* Progress Bar */}
                    <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <span>Progresso do atendimento</span>
                            <span className={styles.progressCount}>{completedCount}/{checklist.length}</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>📋 Checklist</h3>
                        <div className={styles.checklist}>
                            {checklist.map(item => (
                                <label key={item.id} className={styles.checkItem}>
                                    <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onChange={() => handleCheckItem(item.id)}
                                        className={styles.checkbox}
                                    />
                                    <span className={item.checked ? styles.checked : ''}>
                                        {item.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Photos */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>📸 Fotos</h3>
                        <div className={styles.photosGrid}>
                            {photos.map((photo, index) => (
                                <div key={index} className={styles.photoThumb}>
                                    <img src={photo.preview} alt={`Foto ${index + 1}`} />
                                    <button
                                        className={styles.removePhoto}
                                        onClick={() => removePhoto(index)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                className={styles.addPhoto}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span>+</span>
                                <small>Adicionar</small>
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment"
                            onChange={handlePhotoCapture}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Notes */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>📝 Observações</h3>
                        <textarea
                            className={styles.textarea}
                            placeholder="Adicione observações sobre o atendimento..."
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {appointment.notes && (
                        <div className={styles.alertBox}>
                            <strong>⚠️ Atenção:</strong> {appointment.notes}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {uploadProgress && (
                        <p className={styles.uploadProgress}>{uploadProgress}</p>
                    )}
                    <button
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Cancelar
                    </button>
                    <button
                        className={styles.completeBtn}
                        onClick={handleComplete}
                        disabled={uploading || completedCount < checklist.length * 0.5}
                    >
                        {uploading ? 'Finalizando...' : '✅ Finalizar Atendimento'}
                    </button>
                </div>
            </div>
        </div>
    )
}
