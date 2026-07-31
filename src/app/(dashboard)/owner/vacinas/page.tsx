'use client'

import { useState, useEffect } from 'react'
import styles from './vacinas.module.css'
import { 
    getVaccines, 
    upsertVaccine, 
    deleteVaccine, 
    getVaccineBatches, 
    upsertVaccineBatch,
    getAllPetVaccinations
} from '@/app/actions/vaccine'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import InputMasked from '@/components/ui/InputMasked'
import { maskDate, parseDateToISO } from '@/utils/masks'
import PageHelpModal from '@/components/ui/PageHelpModal'

export default function VacinasPage() {
    const [activeTab, setActiveTab] = useState<'catalog' | 'expiry'>('catalog')
    
    // Estados do Catálogo
    const [vaccines, setVaccines] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showVaccineModal, setShowVaccineModal] = useState(false)
    const [showBatchModal, setShowBatchModal] = useState(false)
    const [editingVaccine, setEditingVaccine] = useState<any>(null)
    const [selectedVaccineId, setSelectedVaccineId] = useState<string | null>(null)
    const [batchesMap, setBatchesMap] = useState<Record<string, any[]>>({})
    const [expirationDate, setExpirationDate] = useState('')

    // Estados dos Vencimentos
    const [allPetVaccines, setAllPetVaccines] = useState<any[]>([])
    const [expiryLoading, setExpiryLoading] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [filterStartDate, setFilterStartDate] = useState<string>('')
    const [filterEndDate, setFilterEndDate] = useState<string>('')
    const [filterSearch, setFilterSearch] = useState<string>('')

    useEffect(() => {
        if (activeTab === 'catalog') {
            loadData()
        } else {
            loadExpiryData()
        }
    }, [activeTab, filterStatus, filterStartDate, filterEndDate, filterSearch])

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

    async function loadExpiryData() {
        setExpiryLoading(true)
        const data = await getAllPetVaccinations({
            startDate: filterStartDate || undefined,
            endDate: filterEndDate || undefined,
            status: filterStatus,
            search: filterSearch || undefined
        })
        setAllPetVaccines(data)
        setExpiryLoading(false)
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
            expiration_date: parseDateToISO(expirationDate)
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 className={styles.title}>💉 Módulo de Vacinas</h1>
                    <PageHelpModal topic="vacinas" />
                </div>
                {activeTab === 'catalog' && (
                    <button 
                        className={styles.addButton}
                        onClick={() => {
                            setEditingVaccine(null)
                            setShowVaccineModal(true)
                        }}
                    >
                        <span>➕</span> Nova Vacina
                    </button>
                )}
            </header>

            {/* Abas de Navegação */}
            <div className={styles.tabsContainer}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'catalog' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('catalog')}
                >
                    📦 Catálogo & Estoque
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'expiry' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('expiry')}
                >
                    ⏳ Vencimentos dos Pets
                </button>
            </div>

            {/* ABA 1: CATÁLOGO DE VACINAS */}
            {activeTab === 'catalog' && (
                loading ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyText}>Carregando catálogo...</p>
                    </div>
                ) : vaccines.length === 0 ? (
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
                                
                                <p className={styles.manufacturer} style={{ margin: '0.5rem 0' }}>
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
                                        <p className={styles.emptyText} style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                                            Sem estoque disponível
                                        </p>
                                    ) : (
                                        batchesMap[v.id]?.filter(b => b.quantity > 0).map(b => (
                                            <div key={b.id} className={styles.batchItem}>
                                                <div className={styles.batchInfo}>
                                                    <span className={styles.batchNumber}>Lote: {b.batch_number}</span>
                                                    <span className={styles.batchExpiry}>
                                                        Vence: {format(new Date(b.expiration_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div className={styles.batchQty}>Qtd: {b.quantity}</div>
                                                    <div className={styles.priceTag}>
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
                )
            )}

            {/* ABA 2: VENCIMENTOS DOS PETS */}
            {activeTab === 'expiry' && (
                <div>
                    {/* Barra de Filtros */}
                    <div className={styles.filtersBar}>
                        <div className={styles.filtersRow}>
                            <div className={styles.filterGroup}>
                                <span className={styles.filterLabel}>Busca Rápida</span>
                                <input
                                    type="text"
                                    placeholder="Nome do pet ou tutor..."
                                    className={styles.filterInput}
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <span className={styles.filterLabel}>Vencimento Início</span>
                                <input
                                    type="date"
                                    className={styles.filterInput}
                                    value={filterStartDate}
                                    onChange={(e) => {
                                        setFilterStartDate(e.target.value)
                                        setFilterStatus('custom')
                                    }}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <span className={styles.filterLabel}>Vencimento Fim</span>
                                <input
                                    type="date"
                                    className={styles.filterInput}
                                    value={filterEndDate}
                                    onChange={(e) => {
                                        setFilterEndDate(e.target.value)
                                        setFilterStatus('custom')
                                    }}
                                />
                            </div>
                        </div>

                        {/* Atalhos Rápidos */}
                        <div className={styles.shortcutsRow}>
                            <span className={styles.filterLabel} style={{ marginRight: '0.5rem' }}>Período:</span>
                            <button
                                className={`${styles.shortcutBtn} ${filterStatus === 'all' ? styles.shortcutActive : ''}`}
                                onClick={() => {
                                    setFilterStatus('all')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                            >
                                Todas
                            </button>
                            <button
                                className={`${styles.shortcutBtn} ${filterStatus === 'expired' ? styles.shortcutActive : ''}`}
                                onClick={() => {
                                    setFilterStatus('expired')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                            >
                                Vencidas 🔴
                            </button>
                            <button
                                className={`${styles.shortcutBtn} ${filterStatus === 'upcoming_7' ? styles.shortcutActive : ''}`}
                                onClick={() => {
                                    setFilterStatus('upcoming_7')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                            >
                                Próx. 7 Dias 🟡
                            </button>
                            <button
                                className={`${styles.shortcutBtn} ${filterStatus === 'upcoming_30' ? styles.shortcutActive : ''}`}
                                onClick={() => {
                                    setFilterStatus('upcoming_30')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                            >
                                Próx. 30 Dias 🟢
                            </button>
                            <button
                                className={`${styles.shortcutBtn} ${filterStatus === 'this_month' ? styles.shortcutActive : ''}`}
                                onClick={() => {
                                    setFilterStatus('this_month')
                                    setFilterStartDate('')
                                    setFilterEndDate('')
                                }}
                            >
                                Este Mês
                            </button>
                        </div>
                    </div>

                    {/* Listagem */}
                    {expiryLoading ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyText}>Carregando vencimentos...</p>
                        </div>
                    ) : allPetVaccines.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>⏳</div>
                            <p className={styles.emptyText}>Nenhum vencimento de vacina encontrado para os filtros selecionados.</p>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <div className={styles.tableResponsive}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Pet</th>
                                            <th>Tutor</th>
                                            <th>Vacina / Lote</th>
                                            <th>Aplicação</th>
                                            <th>Vencimento</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allPetVaccines.map((pv) => {
                                            const today = new Date().toISOString().split('T')[0]
                                            const isExpired = pv.expiry_date < today
                                            
                                            const next7 = new Date()
                                            next7.setDate(next7.getDate() + 7)
                                            const next7Str = next7.toISOString().split('T')[0]
                                            const isWarning = !isExpired && pv.expiry_date <= next7Str

                                            let statusBadge = (
                                                <span className={`${styles.badge} ${styles.badgeSuccess}`}>No prazo</span>
                                            )
                                            if (isExpired) {
                                                statusBadge = (
                                                    <span className={`${styles.badge} ${styles.badgeDanger}`}>Vencido</span>
                                                )
                                            } else if (isWarning) {
                                                statusBadge = (
                                                    <span className={`${styles.badge} ${styles.badgeWarning}`}>Vence em breve</span>
                                                )
                                            }

                                            const appDateFormatted = pv.application_date ? format(new Date(pv.application_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'
                                            const expDateFormatted = pv.expiry_date ? format(new Date(pv.expiry_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'

                                            // WhatsApp Link
                                            const tutorPhone = pv.pets?.customers?.phone_1 || ''
                                            const tutorPhoneClean = tutorPhone.replace(/\D/g, '')
                                            const tutorPhoneFinal = tutorPhoneClean.startsWith('55') ? tutorPhoneClean : '55' + tutorPhoneClean
                                            const messageText = `Olá, *${pv.pets?.customers?.name || 'cliente'}*! 🐾\n\nPassando para lembrar que a vacina *${pv.name}* do(a) *${pv.pets?.name}* vence em *${expDateFormatted}*.\n\nManter a imunização em dia é essencial para a proteção dele(a). Vamos agendar um horário para o reforço? 😊💉`
                                            const encodedMsg = encodeURIComponent(messageText)
                                            const waLink = `https://wa.me/${tutorPhoneFinal}?text=${encodedMsg}`

                                            return (
                                                <tr key={pv.id}>
                                                    <td style={{ fontWeight: 600, color: 'var(--color-sky)' }}>{pv.pets?.name}</td>
                                                    <td>
                                                        <div className={styles.tutorInfo}>
                                                            <span className={styles.tutorName}>{pv.pets?.customers?.name || '-'}</span>
                                                            <span className={styles.tutorPhone}>{tutorPhone || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 500 }}>{pv.name}</div>
                                                        {pv.batch_number && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lote: {pv.batch_number}</div>
                                                        )}
                                                    </td>
                                                    <td>{appDateFormatted}</td>
                                                    <td style={{ fontWeight: 600 }}>{expDateFormatted}</td>
                                                    <td>{statusBadge}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {tutorPhone && (
                                                            <a 
                                                                href={waLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className={styles.whatsappBtn}
                                                            >
                                                                💬 Lembrar
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modais do Catálogo */}
            {showVaccineModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.title} style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>{editingVaccine ? 'Editar Vacina' : 'Nova Vacina'}</h2>
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
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <input 
                                            type="checkbox" 
                                            name="target_animals" 
                                            value="Cão" 
                                            defaultChecked={editingVaccine?.target_animals?.includes('Cão')} 
                                        /> Cão
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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

            {showBatchModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.title} style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>Entrada de Lote</h2>
                        <p className={styles.batchExpiry} style={{ marginBottom: '1.5rem' }}>
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
                                <InputMasked
                                    name="expiration_date"
                                    className={styles.input}
                                    required
                                    mask={maskDate}
                                    value={expirationDate}
                                    onChange={setExpirationDate}
                                    placeholder="DD/MM/AAAA"
                                />
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
