'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ImageUploadProps {
    bucket: 'products' | 'avatars' | 'pets'
    url?: string | null
    onUpload: (url: string) => void
    onRemove: () => void
    label?: string
    circle?: boolean // For avatars
}

export default function ImageUpload({
    bucket,
    url,
    onUpload,
    onRemove,
    label = 'Foto',
    circle = false
}: ImageUploadProps) {
    const supabase = createClient()
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(url || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = document.createElement('img')
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const MAX_WIDTH = 800
                    const MAX_HEIGHT = 800
                    let width = img.width
                    let height = img.height

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height
                            height = MAX_HEIGHT
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'))
                        }
                    }, 'image/webp', 0.8)
                }
                img.onerror = (err) => reject(err)
            }
            reader.onerror = (err) => reject(err)
        })
    }

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                return
            }

            const originalFile = event.target.files[0]

            // Generate filename with .webp extension
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.webp`
            const filePath = `${fileName}`

            // Process image (Resize + WebP)
            const processedBlob = await processImage(originalFile)
            const processedFile = new File([processedBlob], fileName, { type: 'image/webp' })

            // 1. Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, processedFile)

            if (uploadError) {
                throw uploadError
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            setPreviewUrl(publicUrl)
            onUpload(publicUrl)

        } catch (error) {
            console.error('Erro ao fazer upload:', error)
            alert('Erro ao fazer upload da imagem.')
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreviewUrl(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        onRemove()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {label && <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#333' }}>{label}</label>}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                    style={{
                        position: 'relative',
                        width: circle ? '100px' : '120px',
                        height: circle ? '100px' : '120px',
                        borderRadius: circle ? '50%' : '8px',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0',
                        border: '2px dashed #ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ fontSize: '2rem' }}>📷</span>
                    )}

                    {uploading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}>
                            ...
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        {uploading ? 'Enviando...' : (previewUrl ? 'Alterar Foto' : 'Selecionar Foto')}
                    </button>

                    {previewUrl && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={uploading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                color: '#d32f2f',
                                border: '1px solid #d32f2f',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Remover
                        </button>
                    )}
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: 'none' }}
                disabled={uploading}
            />
        </div>
    )
}
