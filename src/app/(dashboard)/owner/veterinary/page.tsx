'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { Veterinarian, VetExamType } from '@/types/database'
import {
    getVeterinarians, createVeterinarian, updateVeterinarian,
    getVetExamTypes, createVetExamType, deleteVetExamType
} from '@/app/actions/veterinary'

function VeterinaryContent() {
    const searchParams = useSearchParams()
    const tab = searchParams.get('tab')
    const action = searchParams.get('action')
    const [activeTab, setActiveTab] = useState<'vets' | 'exams'>('vets')

    useEffect(() => {
        if (tab === 'vets' || tab === 'exams') {
            setActiveTab(tab as 'vets' | 'exams')
        }
        if (action === 'new-vet') setIsVetModalOpen(true)
        if (action === 'new-exam') setIsExamModalOpen(true)
    }, [tab, action])

    const [vets, setVets] = useState<Veterinarian[]>([])
    const [examTypes, setExamTypes] = useState<VetExamType[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modals
    const [isVetModalOpen, setIsVetModalOpen] = useState(false)
    const [isExamModalOpen, setIsExamModalOpen] = useState(false)
    const [selectedVet, setSelectedVet] = useState<Veterinarian | null>(null)

    // Forms
    const [vetForm, setVetForm] = useState({
        name: '', crmv: '', specialty: '', phone: '', email: '', consultation_base_price: 0, is_active: true, password: '', createLogin: false
    })

    const [examForm, setExamForm] = useState({
        name: '', description: '', base_price: 0
    })

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [vetsData, examsData] = await Promise.all([
                getVeterinarians(),
                getVetExamTypes()
            ])
            setVets(vetsData)
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

    const handleSaveVet = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        if (selectedVet) formData.append('id', selectedVet.id)
        formData.append('name', vetForm.name)
        formData.append('crmv', vetForm.crmv)
        formData.append('specialty', vetForm.specialty)
        formData.append('phone', vetForm.phone)
        formData.append('email', vetForm.email)
        formData.append('consultation_base_price', vetForm.consultation_base_price.toString())
        formData.append('is_active', vetForm.is_active ? 'true' : 'false')
        if (vetForm.createLogin && vetForm.password) {
            formData.append('password', vetForm.password)
        }

        const res = selectedVet ? await updateVeterinarian(formData) : await createVeterinarian(formData)

        if (res.success) {
            setIsVetModalOpen(false)
            fetchData()
        } else {
            alert(res.message)
        }
    }

    const handleSaveExamType = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('name', examForm.name)
        formData.append('description', examForm.description)
        formData.append('base_price', examForm.base_price.toString())

        const res = await createVetExamType(formData)
        if (res.success) {
            setIsExamModalOpen(false)
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
                    <h1 className={styles.title}>🩺 Clínica Veterinária</h1>
                    <p className={styles.subtitle}>Gerencie a equipe veterinária e o catálogo de exames.</p>
                </div>
                {activeTab === 'vets' ? (
                    <button className={styles.addButton} onClick={() => {
                        setSelectedVet(null)
                        setVetForm({ name: '', crmv: '', specialty: '', phone: '', email: '', consultation_base_price: 0, is_active: true, password: '', createLogin: false })
                        setIsVetModalOpen(true)
                    }}>
                        ➕ Novo Veterinário
                    </button>
                ) : (
                    <button className={styles.addButton} onClick={() => {
                        setExamForm({ name: '', description: '', base_price: 0 })
                        setIsExamModalOpen(true)
                    }}>
                        ➕ Novo Exame
                    </button>
                )}
            </div>

            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'vets' ? styles.active : ''}`}
                    onClick={() => setActiveTab('vets')}
                >
                    Profissionais (Vet)
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'exams' ? styles.active : ''}`}
                    onClick={() => setActiveTab('exams')}
                >
                    Catálogo de Exames
                </button>
            </div>

            {activeTab === 'vets' && (
                <div className={styles.listContainer}>
                    {vets.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Nenhum veterinário cadastrado.</p> : vets.map(vet => (
                        <div key={vet.id} className={styles.card}>
                            <div className={styles.cardInfo}>
                                <h3>{vet.name} {vet.is_active ? <span className={`${styles.statusBadge} ${styles.statusActive}`}>Ativo</span> : <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Inativo</span>}</h3>
                                <div className={styles.cardMeta}>
                                    <strong>CRMV:</strong> {vet.crmv} {vet.specialty && `• Especialidade: ${vet.specialty}`}
                                </div>
                                <div className={styles.cardMeta}>
                                    Valor Base Consulta: R$ {vet.consultation_base_price?.toFixed(2) || '0.00'}
                                </div>
                            </div>
                            <button className={styles.editButton} onClick={() => {
                                setSelectedVet(vet)
                                setVetForm({
                                    name: vet.name,
                                    crmv: vet.crmv,
                                    specialty: vet.specialty || '',
                                    phone: vet.phone || '',
                                    email: vet.email || '',
                                    consultation_base_price: vet.consultation_base_price,
                                    is_active: vet.is_active,
                                    password: '',
                                    createLogin: false
                                })
                                setIsVetModalOpen(true)
                            }}>Editar</button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'exams' && (
                <div className={styles.listContainer}>
                    {examTypes.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Nenhum exame cadastrado.</p> : examTypes.map(exam => (
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
            )}

            {/* Modal Veterinário */}
            {isVetModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsVetModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setIsVetModalOpen(false)}>×</button>
                        <h2>{selectedVet ? 'Editar Veterinário' : 'Novo Veterinário'}</h2>

                        <form onSubmit={handleSaveVet}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nome Completo *</label>
                                <input required className={styles.input} value={vetForm.name} onChange={e => setVetForm({ ...vetForm, name: e.target.value })} />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>CRMV *</label>
                                    <input required className={styles.input} value={vetForm.crmv} onChange={e => setVetForm({ ...vetForm, crmv: e.target.value })} placeholder="Ex: CRMV-SP 12345" />
                                </div>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Especialidade</label>
                                    <input className={styles.input} value={vetForm.specialty} onChange={e => setVetForm({ ...vetForm, specialty: e.target.value })} placeholder="Ex: Clínico Geral, Dermatologia" />
                                </div>
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Telefone</label>
                                    <input className={styles.input} value={vetForm.phone} onChange={e => setVetForm({ ...vetForm, phone: e.target.value })} />
                                </div>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Email</label>
                                    <input type="email" className={styles.input} value={vetForm.email} onChange={e => setVetForm({ ...vetForm, email: e.target.value })} />
                                </div>
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Valor Base da Consulta (R$) *</label>
                                    <input type="number" step="0.01" min="0" required className={styles.input} value={vetForm.consultation_base_price} onChange={e => setVetForm({ ...vetForm, consultation_base_price: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            {!selectedVet && (
                                <div className={styles.formGroup} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        <input type="checkbox" checked={vetForm.createLogin} onChange={e => setVetForm({ ...vetForm, createLogin: e.target.checked })} />
                                        Criar / Habilitar Acesso ao Sistema (Login)
                                    </label>
                                    {vetForm.createLogin && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <label className={styles.label}>Senha de Acesso *</label>
                                            <input type="password" required={vetForm.createLogin} className={styles.input} value={vetForm.password} onChange={e => setVetForm({ ...vetForm, password: e.target.value })} placeholder="Senha para o veterinário logar" />
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>O email acima será usado como login do sistema.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <input type="checkbox" checked={vetForm.is_active} onChange={e => setVetForm({ ...vetForm, is_active: e.target.checked })} />
                                    Profissional Ativo (Aparece nas listagens)
                                </label>
                            </div>

                            <button type="submit" className={styles.submitButton} style={{ marginTop: '1.5rem' }}>Salvar Profissional</button>
                        </form>
                    </div>
                </div>
            )}

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

export default function VeterinaryPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>Carregando Clínica...</div>}>
            <VeterinaryContent />
        </Suspense>
    )
}
