'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, X, Upload, CheckCircle2 } from 'lucide-react'

interface FileUploadProps {
    bucket: string
    url?: string | null
    onUpload: (url: string) => void
    onRemove: () => void
    label?: string
    accept?: string
}

export default function FileUpload({
    bucket,
    url,
    onUpload,
    onRemove,
    label = 'Arquivo',
    accept = '.pdf,.jpg,.jpeg,.png'
}: FileUploadProps) {
    const supabase = createClient()
    const [uploading, setUploading] = useState(false)
    const [currentUrl, setCurrentUrl] = useState<string | null>(url || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                return
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            setCurrentUrl(publicUrl)
            onUpload(publicUrl)

        } catch (error) {
            console.error('Erro ao fazer upload:', error)
            alert('Erro ao fazer upload do arquivo.')
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setCurrentUrl(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        onRemove()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {label && <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</label>}

            <div 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    padding: '1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    textAlign: 'center',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100px'
                }}
            >
                {currentUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Arquivo Enviado</p>
                            <a 
                                href={currentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ fontSize: '0.8rem', color: 'var(--color-sky)', textDecoration: 'none' }}
                            >
                                Visualizar Arquivo
                            </a>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleRemove}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-coral)', cursor: 'pointer', padding: '8px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            <Upload size={32} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {uploading ? 'Enviando...' : 'Arraste ou clique para selecionar PDF ou Imagem'}
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                marginTop: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'var(--color-sky)',
                                color: 'var(--bg-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 700
                            }}
                        >
                            {uploading ? '...' : 'Selecionar Arquivo'}
                        </button>
                    </>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleUpload}
                style={{ display: 'none' }}
                disabled={uploading}
            />
        </div>
    )
}
