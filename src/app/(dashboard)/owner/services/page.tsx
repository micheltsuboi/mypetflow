'use client'
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useActionState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import {
    createService,
    updateService,
    deleteService,
    createPricingRule,
    deletePricingRule
} from '@/app/actions/service'
import PlanGuard from '@/components/modules/PlanGuard'
import { Trash2, Edit2, Check, X, ListChecks, Settings } from 'lucide-react'

interface PricingRule {
    id: string
    service_id: string
    weight_min: number | null
    weight_max: number | null
    size: 'small' | 'medium' | 'large' | 'giant' | null
    day_of_week: number | null
    fixed_price: number
}

interface ServiceCategory {
    id: string
    name: string
    color: string
    icon: string
}

interface Service {
    id: string
    name: string
    description: string | null
    base_price: number
    category: string
    category_id?: string
    service_categories?: ServiceCategory
    duration_minutes: number | null
    pricing_matrix: PricingRule[]
    scheduling_rules?: { day: number, species: string[] }[]
    target_species?: 'dog' | 'cat' | 'both'
    checklist_template?: string[]
}

const initialState = { message: '', success: false }

export default function ServicesPage() {
    const supabase = createClient()
    const [services, setServices] = useState<Service[]>([])
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedService, setSelectedService] = useState<Service | null>(null)

    // Scheduling Rules State
    const [schedulingRules, setSchedulingRules] = useState<{ day: number, species: string[] }[]>([])
    const [newRuleDay, setNewRuleDay] = useState<string>('')
    const [newRuleSpecies, setNewRuleSpecies] = useState<string[]>([])

    // Checklist State
    const [checklistTemplate, setChecklistTemplate] = useState<string[]>([])
    const [newItemText, setNewItemText] = useState('')
    const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null)
    const [editingChecklistText, setEditingChecklistText] = useState('')

    // Loading State
    const [ruleLoading, setRuleLoading] = useState(false)
    const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)

    // Form Action States
    const [createState, createAction, isCreatePending] = useActionState(createService, initialState)
    const [updateState, updateAction, isUpdatePending] = useActionState(updateService, initialState)

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (!showModal) {
            // Reset form state when modal closes
            setSelectedService(null)
            setIsEditing(false)
            setSchedulingRules([])
            setChecklistTemplate([])
            setNewRuleDay('')
            setNewRuleSpecies([])
            setNewItemText('')
        }
    }, [showModal])

    useEffect(() => {
        if (createState.success || updateState.success) {
            setShowModal(false)
            fetchData()
        }
    }, [createState, updateState])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return

        const { data: cats } = await supabase.from('service_categories').select('*').order('name')
        if (cats) setCategories(cats)

        const { data: svcs } = await supabase.from('services').select(`
            *,
            service_categories (*),
            pricing_matrix (*)
        `).eq('org_id', profile.org_id).order('name')

        if (svcs) {
            const formatted: Service[] = svcs.map((s: any) => ({
                ...s,
                pricing_matrix: s.pricing_matrix || [],
                scheduling_rules: s.scheduling_rules || [],
                checklist_template: s.checklist_template || []
            }))
            setServices(formatted)
        }
    }

    const handleEdit = (service: Service) => {
        setSelectedService(service)
        setSchedulingRules(service.scheduling_rules || [])
        setChecklistTemplate(service.checklist_template || [])
        setIsEditing(true)
        setShowModal(true)
    }

    const handleDeleteService = async () => {
        if (!selectedService || !confirm('Tem certeza que deseja excluir este serviço?')) return
        await deleteService(selectedService.id)
        setShowModal(false)
        fetchData()
    }

    // --- Scheduling Rules Helpers ---
    const toggleSpecies = (species: string) => {
        setNewRuleSpecies(prev =>
            prev.includes(species) ? prev.filter(s => s !== species) : [...prev, species]
        )
    }

    const handleAddSchedulingRule = () => {
        if (!newRuleDay || newRuleSpecies.length === 0) return
        const day = parseInt(newRuleDay)
        
        const newRule = { day, species: newRuleSpecies }
        let updated = [...schedulingRules]

        if (editingRuleIndex !== null) {
            updated[editingRuleIndex] = newRule
            setEditingRuleIndex(null)
        } else {
            const existing = schedulingRules.findIndex(r => r.day === day)
            if (existing >= 0) {
                updated[existing] = newRule
            } else {
                updated.push(newRule)
            }
        }

        setSchedulingRules(updated)
        setNewRuleDay('')
        setNewRuleSpecies([])
    }

    const handleEditSchedulingRule = (index: number) => {
        const rule = schedulingRules[index]
        setNewRuleDay(rule.day.toString())
        setNewRuleSpecies(rule.species)
        setEditingRuleIndex(index)
    }

    const handleRemoveSchedulingRule = (index: number) => {
        setSchedulingRules(prev => prev.filter((_, i) => i !== index))
    }

    // --- Checklist Helpers ---
    const handleAddChecklistItem = () => {
        if (!newItemText.trim()) return
        setChecklistTemplate(prev => [...prev, newItemText.trim()])
        setNewItemText('')
    }

    const handleEditChecklistItem = (index: number) => {
        setEditingChecklistIndex(index)
        setEditingChecklistText(checklistTemplate[index])
    }

    const handleSaveChecklistItem = (index: number) => {
        if (!editingChecklistText.trim()) return
        const updated = [...checklistTemplate]
        updated[index] = editingChecklistText.trim()
        setChecklistTemplate(updated)
        setEditingChecklistIndex(null)
        setEditingChecklistText('')
    }

    const handleRemoveChecklistItem = (index: number) => {
        setChecklistTemplate(prev => prev.filter((_, i) => i !== index))
        if (editingChecklistIndex === index) setEditingChecklistIndex(null)
    }

    // --- Pricing Rule Actions ---
    const handleAddRule = async (formData: FormData) => {
        if (!selectedService) return
        setRuleLoading(true)
        formData.append('service_id', selectedService.id)
        await createPricingRule(initialState, formData)

        // Refresh data but keep modal open
        await fetchData()
        // We need to re-find the selected service to update the matrix in the modal
        const { data } = await supabase.from('services').select('*, pricing_matrix(*)').eq('id', selectedService.id).single()
        if (data) {
            setSelectedService({ ...data, pricing_matrix: (data as any).pricing_matrix || [] })
        }
        setRuleLoading(false)
    }

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Excluir regra?')) return
        await deletePricingRule(id)
        await fetchData()
        const { data } = await supabase.from('services').select('*, pricing_matrix(*)').eq('id', selectedService!.id).single()
        if (data) {
            setSelectedService({ ...data, pricing_matrix: (data as any).pricing_matrix || [] })
        }
    }

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.service_categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <PlanGuard requiredModule="servicos">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Serviços</h1>
                        <p className={styles.subtitle}>Gerencie os serviços oferecidos no petshop</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className={styles.addBtn}>
                        + Novo Serviço
                    </button>
                </div>

                <div className={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Buscar serviço..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.grid}>
                    {filteredServices.map(service => (
                        <div key={service.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.iconWrapper}>
                                    {service.service_categories?.icon || '📦'}
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>{service.name}</h3>
                                    <span className={styles.category}>{service.service_categories?.name || 'Sem categoria'}</span>
                                </div>
                            </div>
                            <div className={styles.cardBody}>
                                <p className={styles.price}>R$ {service.base_price.toFixed(2)}</p>
                                <p className={styles.duration}>⏱ {service.duration_minutes} min</p>
                                {service.target_species && (
                                    <p className={styles.speciesTag}>
                                        {service.target_species === 'both' ? '🐶 e 🐱' : service.target_species === 'dog' ? '🐶 Cães' : '🐱 Gatos'}
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <div className={styles.configBadge} title="Possui Checklist">
                                        <ListChecks size={14} /> <span>{(service.checklist_template?.length || 0)} Itens</span>
                                    </div>
                                    <div className={styles.configBadge} title="Possui Regras de Preço">
                                        <Settings size={14} /> <span>{(service.pricing_matrix?.length || 0)} Regras</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleEdit(service)} className={styles.editBtn}>
                                <Edit2 size={14} style={{ marginRight: '6px' }} /> Editar Serviço & Configurações
                            </button>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2>{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                                <button onClick={() => setShowModal(false)} className={styles.closeBtn}>&times;</button>
                            </div>

                            <form action={isEditing ? updateAction : createAction} id="serviceForm" className={styles.formScroller}>
                                {isEditing && <input type="hidden" name="id" value={selectedService?.id} />}

                                {/* Hidden JSON Inputs */}
                                <input type="hidden" name="scheduling_rules" value={JSON.stringify(schedulingRules)} />
                                <input type="hidden" name="checklist_template" value={JSON.stringify(checklistTemplate)} />

                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Nome do Serviço</label>
                                        <input name="name" className={styles.input} defaultValue={selectedService?.name || ''} required />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Categoria</label>
                                        <select
                                            name="category_id"
                                            className={styles.select}
                                            defaultValue={selectedService?.category_id || ''}
                                            required
                                            onChange={(e) => {
                                                const cat = categories.find(c => c.id === e.target.value)
                                                // Optional: update hidden category_name if backend requires it
                                                const input = document.getElementById('category_name_input') as HTMLInputElement
                                                if (input && cat) input.value = cat.name
                                            }}
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                            ))}
                                        </select>
                                        <input type="hidden" name="category_name" id="category_name_input" defaultValue={selectedService?.service_categories?.name || 'Banho e Tosa'} />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Espécie Alvo</label>
                                        <select name="target_species" className={styles.select} defaultValue={selectedService?.target_species || 'both'}>
                                            <option value="both">🐶 e 🐱 (Ambos)</option>
                                            <option value="dog">🐶 Cães Apenas</option>
                                            <option value="cat">🐱 Gatos Apenas</option>
                                        </select>
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Preço Base (R$)</label>
                                        <input name="base_price" type="number" step="0.01" className={styles.input} defaultValue={selectedService?.base_price} required />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Duração</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                name="duration_hours"
                                                type="number"
                                                min="0"
                                                placeholder="Hrs"
                                                className={styles.input}
                                                defaultValue={selectedService?.duration_minutes ? Math.floor(selectedService.duration_minutes / 60) : 0}
                                            />
                                            <input
                                                name="duration_minutes_part"
                                                type="number"
                                                min="0"
                                                max="59"
                                                placeholder="Min"
                                                className={styles.input}
                                                defaultValue={selectedService?.duration_minutes ? selectedService.duration_minutes % 60 : 30}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.inputGroup} style={{ gridColumn: '1/-1' }}>
                                        <label className={styles.label}>Descrição</label>
                                        <textarea name="description" className={styles.input} defaultValue={selectedService?.description || ''} rows={3} />
                                    </div>
                                </div>

                                {/* Scheduling Rules UI */}
                                <div className={styles.sectionBox}>
                                    <h4>🕒 Restrições de Agendamento (Dia x Espécie)</h4>
                                    <div className={styles.inlineForm}>
                                        <select value={newRuleDay} onChange={e => setNewRuleDay(e.target.value)} className={styles.selectSmall}>
                                            <option value="">Dia...</option>
                                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                                        </select>
                                        <div className={styles.checkboxGroup}>
                                            <label><input type="checkbox" checked={newRuleSpecies.includes('dog')} onChange={() => toggleSpecies('dog')} /> Cães</label>
                                            <label><input type="checkbox" checked={newRuleSpecies.includes('cat')} onChange={() => toggleSpecies('cat')} /> Gatos</label>
                                        </div>
                                        <button type="button" onClick={handleAddSchedulingRule} className={styles.addBtnSmall}>+ Regra</button>
                                    </div>
                                    <div className={styles.tagsContainer}>
                                        {schedulingRules.map((rule, idx) => (
                                            <span key={idx} className={`${styles.tag} ${editingRuleIndex === idx ? styles.activeTag : ''}`}>
                                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][rule.day]}: {rule.species.map(s => s === 'dog' ? '🐶' : '🐱').join(', ')}
                                                <div className={styles.tagActions}>
                                                    <button type="button" onClick={() => handleEditSchedulingRule(idx)} className={styles.editBtnTag} title="Editar"><Edit2 size={12} /></button>
                                                    <button type="button" onClick={() => handleRemoveSchedulingRule(idx)} className={styles.removeBtnTag} title="Excluir"><Trash2 size={12} /></button>
                                                </div>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Checklist UI */}
                                <div className={styles.sectionBox}>
                                    <h4>📋 Checklist Padrão</h4>
                                    <div className={styles.inlineForm}>
                                        <input
                                            type="text"
                                            value={newItemText}
                                            onChange={e => setNewItemText(e.target.value)}
                                            placeholder="Novo item..."
                                            className={styles.input}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                                        />
                                        <button type="button" onClick={handleAddChecklistItem} className={styles.addBtnSmall}>Add</button>
                                    </div>
                                    <ul className={styles.checklist}>
                                        {checklistTemplate.map((item, idx) => (
                                            <li key={idx}>
                                                {editingChecklistIndex === idx ? (
                                                    <div className={styles.itemEditRow}>
                                                        <input 
                                                            className={styles.input} 
                                                            value={editingChecklistText} 
                                                            onChange={e => setEditingChecklistText(e.target.value)} 
                                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSaveChecklistItem(idx))}
                                                            autoFocus
                                                        />
                                                        <button type="button" onClick={() => handleSaveChecklistItem(idx)} className={styles.saveBtnSmall} title="Salvar"><Check size={16} /></button>
                                                        <button type="button" onClick={() => setEditingChecklistIndex(null)} className={styles.cancelBtnSmall} title="Cancelar"><X size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span>{idx + 1}. {item}</span>
                                                        <div className={styles.itemActions}>
                                                            <button type="button" onClick={() => handleEditChecklistItem(idx)} className={styles.editBtnItem} title="Editar"><Edit2 size={16} /></button>
                                                            <button type="button" onClick={() => handleRemoveChecklistItem(idx)} className={styles.removeBtnItem} title="Excluir"><Trash2 size={16} /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className={styles.modalActions}>
                                    {isEditing && (
                                        <button type="button" className={styles.deleteServiceBtn} onClick={handleDeleteService}>Excluir</button>
                                    )}
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className={styles.submitBtn} disabled={isCreatePending || isUpdatePending}>
                                        {isEditing ? 'Salvar' : 'Criar'}
                                    </button>
                                </div>
                            </form>

                            {/* Pricing Matrix - Edit Mode Only */}
                            {isEditing && selectedService && (
                                <div className={styles.matrixSection}>
                                    <h3>Matriz de Preços</h3>
                                    <table className={styles.matrixTable}>
                                        <thead>
                                            <tr>
                                                <th>Min/Max (kg)</th>
                                                <th>Porte</th>
                                                <th>Dia</th>
                                                <th>Preço</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedService.pricing_matrix?.map(rule => (
                                                <tr key={rule.id}>
                                                    <td>{rule.weight_min ?? 0} - {rule.weight_max ?? '∞'}</td>
                                                    <td>{rule.size || '-'}</td>
                                                    <td>{rule.day_of_week !== null ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][rule.day_of_week] : '-'}</td>
                                                    <td>R$ {rule.fixed_price.toFixed(2)}</td>
                                                    <td><button type="button" onClick={() => handleDeleteRule(rule.id)} className={styles.deleteBtnSmall} title="Excluir"><Trash2 size={16} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Add Rule Form */}
                                    <form action={handleAddRule} className={styles.matrixForm}>
                                        <input name="weight_min" type="number" step="0.1" placeholder="Min Kg" className={styles.inputSmall} />
                                        <input name="weight_max" type="number" step="0.1" placeholder="Max Kg" className={styles.inputSmall} />
                                        <select name="size" className={styles.selectSmall}>
                                            <option value="">Porte...</option>
                                            <option value="small">Peq</option>
                                            <option value="medium">Med</option>
                                            <option value="large">Gnd</option>
                                            <option value="giant">Gig</option>
                                        </select>
                                        <select name="day_of_week" className={styles.selectSmall}>
                                            <option value="">Dia...</option>
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                                        </select>
                                        <input name="price" type="number" step="0.01" placeholder="R$" className={styles.inputSmall} required />
                                        <button type="submit" className={styles.addBtnSmall} disabled={ruleLoading}>+</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PlanGuard>
    )
}


