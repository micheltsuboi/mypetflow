'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { VetExamType } from '@/types/database'
import {
    getVetExamTypes, createVetExamType, deleteVetExamType
} from '@/app/actions/veterinary'

function ExamsContent() {
    const searchParams = useSearchParams()
    const action = searchParams.get('action')
    const [examTypes, setExamTypes] = useState<VetExamType[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modals
    const [isExamModalOpen, setIsExamModalOpen] = useState(false)

    // Forms
    const [examForm, setExamForm] = useState({
        name: '', description: '', base_price: 0
    })

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const examsData = await getVetExamTypes()
            setExamTypes(examsData)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        if (action === 'new-exam') setIsExamModalOpen(true)
    }, [action])

    const handleSaveExamType = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('name', examForm.name)
        formData.append('description', examForm.description)
        formData.append('base_price', examForm.base_price.toString())

        const res = await createVetExamType(formData)
        if (res.success) {
            setIsExamModalOpen(false)
            setExamForm({ name: '', description: '', base_price: 0 })
            fetchData()
        } else {
            alert(res.message)
        }
    }

    const handleDeleteExamType = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar este exame?')) return
        const res = await deleteVetExamType(id)
        if (res.success) fetchData()
        else alert(res.message)
    }

    if (isLoading) {
        return <div className={styles.container} style={{ textAlign: 'center', marginTop: '3rem' }}>Carregando...</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>🧪 Catálogo de Exames</h1>
                    <p className={styles.subtitle}>Gerencie os tipos de exames disponíveis na clínica.</p>
                </div>
                <button className={styles.addButton} onClick={() => {
                    setExamForm({ name: '', description: '', base_price: 0 })
                    setIsExamModalOpen(true)
                }}>
                    ➕ Novo Exame
                </button>
            </div>

            <div className={styles.listContainer}>
                {examTypes.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhum exame cadastrado.</p>
                 ) : examTypes.map(exam => (
                    <div key={exam.id} className={styles.card}>
                        <div className={styles.cardInfo}>
                            <h3>{exam.name}</h3>
                            <div className={styles.cardMeta}>
                                {exam.description || 'Sem descrição'}
                            </div>
                            <div className={styles.cardMeta}>
                                Valor Base: <strong>R$ {exam.base_price?.toFixed(2) || '0.00'}</strong>
                            </div>
                        </div>
                        <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteExamType(exam.id)}
                            title="Desativar Exame"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal Exame */}
            {isExamModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsExamModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setIsExamModalOpen(false)}>×</button>
                        <h2>Novo Tipo de Exame</h2>

                        <form onSubmit={handleSaveExamType}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nome do Exame *</label>
                                <input required className={styles.input} value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} placeholder="Ex: Hemograma Completo" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Preço Base / Custo Repasse (R$) *</label>
                                <input type="number" step="0.01" min="0" required className={styles.input} value={examForm.base_price} onChange={e => setExamForm({ ...examForm, base_price: parseFloat(e.target.value) })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Descrição / Observações</label>
                                <textarea className={styles.textarea} value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} placeholder="Informações de preparo, tempo de jejum, etc..." />
                            </div>

                            <button type="submit" className={styles.submitButton}>Cadastrar Exame</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ExamsPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>Carregando Catálogo...</div>}>
            <ExamsContent />
        </Suspense>
    )
}
