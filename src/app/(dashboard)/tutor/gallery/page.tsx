'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Photo {
    id: string
    url: string
    date: string
    service_name: string
}

// Mock data para demonstração
const mockPhotos: Photo[] = [
    {
        id: '1',
        url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
        date: new Date().toISOString(),
        service_name: 'Banho + Tosa'
    },
    {
        id: '2',
        url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        service_name: 'Banho'
    },
    {
        id: '3',
        url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        service_name: 'Creche'
    },
    {
        id: '4',
        url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        service_name: 'Banho + Tosa'
    },
    {
        id: '5',
        url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        service_name: 'Hotel'
    },
    {
        id: '6',
        url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        service_name: 'Banho'
    }
]

export default function GalleryPage() {
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

    useEffect(() => {
        setTimeout(() => {
            setPhotos(mockPhotos)
            setLoading(false)
        }, 300)
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando fotos...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <a href="/tutor" className={styles.backButton}>← Voltar</a>
                <h1 className={styles.title}>🖼️ Galeria do Thor</h1>
            </div>

            <div className={styles.gallery}>
                {photos.map((photo) => (
                    <div
                        key={photo.id}
                        className={styles.photoCard}
                        onClick={() => setSelectedPhoto(photo)}
                    >
                        <img src={photo.url} alt={`Foto de ${photo.service_name}`} />
                        <div className={styles.photoOverlay}>
                            <span className={styles.photoService}>{photo.service_name}</span>
                            <span className={styles.photoDate}>{formatDate(photo.date)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {selectedPhoto && (
                <div className={styles.lightbox} onClick={() => setSelectedPhoto(null)}>
                    <button className={styles.closeBtn}>✕</button>
                    <img src={selectedPhoto.url} alt="Foto ampliada" />
                    <div className={styles.lightboxInfo}>
                        <span>{selectedPhoto.service_name}</span>
                        <span>{formatDate(selectedPhoto.date)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
