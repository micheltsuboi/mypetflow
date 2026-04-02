'use client'

import { useState, useEffect } from 'react'
import styles from './vacinas.module.css'
import { 
    getVaccines, 
    upsertVaccine, 
    deleteVaccine, 
    getVaccineBatches, 
    upsertVaccineBatch 
} from '@/app/actions/vaccine'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function VacinasPage() {
    const [vaccines, setVaccines] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showVaccineModal, setShowVaccineModal] = useState(false)
    const [showBatchModal, setShowBatchModal] = useState(false)
    const [editingVaccine, setEditingVaccine] = useState<any>(null)
    const [selectedVaccineId, setSelectedVaccineId] = useState<string | null>(null)
    const [batchesMap, setBatchesMap] = useState<Record<string, any[]>>({})

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const data = await getVaccines()
        setVaccines(data)
        
        // Load batches for each vaccine
        const newBatchesMap: Record<string, any[]> = {}
        for (const v of data) {
            const batches = await getVaccineBatches(v.id)
            newBatchesMap[v.id] = batches
        }
        setBatchesMap(newBatchesMap)
        setLoading(false)
    }

    const handleSaveVaccine = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            id: editingVaccine?.id,
            name: formData.get('name'),
            manufacturer: formData.get('manufacturer'),
            description: formData.get('description'),
            target_animals: formData.getAll('target_animals')
        }

        const res = await upsertVaccine(data)
        if (res.success) {
            setShowVaccineModal(false)
            setEditingVaccine(null)
            loadData()
        } else {
            alert(res.message)
        }
    }

    const handleSaveBatch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            vaccine_id: selectedVaccineId,
            batch_number: formData.get('batch_number'),
            quantity: parseInt(formData.get('quantity') as string),
            cost_total: parseFloat(formData.get('cost_total') as string),
            selling_price: parseFloat(formData.get('selling_price') as string),
            expiration_date: formData.get('expiration_date')
        }

        const res = await upsertVaccineBatch(data)
        if (res.success) {
            setShowBatchModal(false)
            loadData()
        } else {
            alert(res.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta vacina? Todos os lotes associados também serão excluídos.')) {
            const res = await deleteVaccine(id)
            if (res.success) loadData()
            else alert(res.message)
        }
    }

    if (loading) return <div className={styles.container}>Carregando...</div>

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Catálogo de Vacinas</h1>
                <button 
                    className={styles.addButton}
                    onClick={() => {
                        setEditingVaccine(null)
                        setShowVaccineModal(true)
                    }}
                >
                    <span>➕</span> Nova Vacina
                </button>
            </header>

            {vaccines.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>💉</div>
                    <p className={styles.emptyText}>Nenhuma vacina cadastrada ainda.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {vaccines.map((v) => (
                        <div key={v.id} className={styles.vaccineCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.vaccineName}>{v.name}</h3>
                                    <span className={styles.manufacturer}>{v.manufacturer}</span>
                                </div>
                                <div className={styles.actions}>
                                    <button 
                                        className={`${styles.iconButton} ${styles.editBtn}`}
                                        onClick={() => {
                                            setEditingVaccine(v)
                                            setShowVaccineModal(true)
                                        }}
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        className={`${styles.iconButton} ${styles.deleteBtn}`}
                                        onClick={() => handleDelete(v.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            
                            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0' }}>
                                {v.target_animals?.join(', ')}
                            </p>

                            <div className={styles.batchList}>
                                <div className={styles.batchHeader}>
                                    <span className={styles.batchTitle}>Lotes em Estoque</span>
                                    <button 
                                        className={styles.addBatchBtn}
                                        onClick={() => {
                                            setSelectedVaccineId(v.id)
                                            setShowBatchModal(true)
                                        }}
                                    >
                                        + Entrada
                                    </button>
                                </div>
                                
                                {batchesMap[v.id]?.filter(b => b.quantity > 0).length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                        Sem estoque disponível
                                    </p>
                                ) : (
                                    batchesMap[v.id]?.filter(b => b.quantity > 0).map(b => (
                                        <div key={b.id} className={styles.batchItem}>
                                            <div className={styles.batchInfo}>
                                                <span className={styles.batchNumber}>Lote: {b.batch_number}</span>
                                                <span className={styles.batchExpiry}>
                                                    Vence: {format(new Date(b.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className={styles.batchQty}>Qtd: {b.quantity}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                                                    R$ {b.selling_price?.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Vaccine Modal */}
            {showVaccineModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingVaccine ? 'Editar Vacina' : 'Nova Vacina'}</h2>
                        <form onSubmit={handleSaveVaccine}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nome da Vacina</label>
                                <input 
                                    name="name" 
                                    className={styles.input} 
                                    defaultValue={editingVaccine?.name} 
                                    required 
                                    placeholder="Ex: V10, Antirrábica..." 
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Fabricante / Laboratório</label>
                                <input 
                                    name="manufacturer" 
                                    className={styles.input} 
                                    defaultValue={editingVaccine?.manufacturer} 
                                    required 
                                    placeholder="Ex: Zoetis, MSD..." 
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Descrição (Opcional)</label>
                                <textarea 
                                    name="description" 
                                    className={styles.input} 
                                    defaultValue={editingVaccine?.description} 
                                    rows={3}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Espécies Alvo</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <input 
                                            type="checkbox" 
                                            name="target_animals" 
                                            value="Cão" 
                                            defaultChecked={editingVaccine?.target_animals?.includes('Cão')} 
                                        /> Cão
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <input 
                                            type="checkbox" 
                                            name="target_animals" 
                                            value="Gato" 
                                            defaultChecked={editingVaccine?.target_animals?.includes('Gato')} 
                                        /> Gato
                                    </label>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowVaccineModal(false)}>Cancelar</button>
                                <button type="submit" className={styles.submitBtn}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Batch Modal */}
            {showBatchModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 style={{ marginBottom: '1rem' }}>Entrada de Lote (Estoque)</h2>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                            A entrada de lote gerará automaticamente uma **despesa** no financeiro baseada no custo total.
                        </p>
                        <form onSubmit={handleSaveBatch}>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Número do Lote</label>
                                    <input name="batch_number" className={styles.input} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Quantidade</label>
                                    <input type="number" name="quantity" className={styles.input} required min="1" />
                                </div>
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Custo Total Lote (R$)</label>
                                    <input type="number" step="0.01" name="cost_total" className={styles.input} required placeholder="0.00" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Preço Venda Unit. (R$)</label>
                                    <input type="number" step="0.01" name="selling_price" className={styles.input} required placeholder="0.00" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Data de Validade</label>
                                <input type="date" name="expiration_date" className={styles.input} required />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowBatchModal(false)}>Cancelar</button>
                                <button type="submit" className={styles.submitBtn}>Registrar Entrada</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
