'use client'

import { useState, useEffect } from 'react'
import { fetchPlans, createPlan, updatePlan, togglePlanStatus, SaasPlan } from '@/app/actions/plans'
import PlanModal from './PlanModal'
import styles from './page.module.css'

export default function PlanosSaaSPage() {
    const [plans, setPlans] = useState<SaasPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadPlans()
    }, [])

    const loadPlans = async () => {
        setLoading(true)
        const data = await fetchPlans()
        setPlans(data)
        setLoading(false)
    }

    const handleSavePlan = async (formData: FormData) => {
        setSaving(true)
        setError('')

        const result = editingPlan
            ? await updatePlan(editingPlan.id, formData)
            : await createPlan(formData)

        if (result.success) {
            setIsModalOpen(false)
            setEditingPlan(null)
            loadPlans()
        } else {
            setError(result.message || 'Erro ao salvar plano.')
        }

        setSaving(false)
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const result = await togglePlanStatus(id, currentStatus)
        if (result.success) {
            loadPlans()
        } else {
            alert(result.message || 'Erro ao alterar status')
        }
    }

    const openEditModal = (plan: SaasPlan) => {
        setEditingPlan(plan)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        setEditingPlan(null)
        setIsModalOpen(true)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gerenciar Planos (SaaS)</h1>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    + Novo Plano
                </button>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            {loading ? (
                <div className={styles.loading}>Carregando planos...</div>
            ) : (
                <div className={styles.grid}>
                    {plans.map((plan) => (
                        <div key={plan.id} className={`${styles.planCard} ${!plan.is_active ? styles.inactive : ''}`}>
                            <div className={styles.planHeader}>
                                <h2>{plan.name}</h2>
                                <span className={`${styles.statusBadge} ${plan.is_active ? styles.activeBadge : styles.inactiveBadge}`}>
                                    {plan.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <p className={styles.description}>{plan.description || 'Sem descrição'}</p>

                            <div className={styles.price}>
                                R$ {plan.price?.toFixed(2) || '0.00'} / mês
                            </div>

                            <div className={styles.features}>
                                <strong>Módulos ({plan.features?.length || 0}):</strong>
                                <div className={styles.featureTags}>
                                    {plan.features?.map(feat => (
                                        <span key={feat} className={styles.tag}>{feat}</span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <button className="btn btn-secondary" onClick={() => openEditModal(plan)}>
                                    Editar
                                </button>
                                <button
                                    className={`btn ${plan.is_active ? 'btn-danger' : 'btn-success'}`}
                                    onClick={() => handleToggleStatus(plan.id, plan.is_active)}
                                >
                                    {plan.is_active ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && (
                        <div className={styles.emptyState}>
                            Nenhum plano cadastrado.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePlan}
                    loading={saving}
                />
            )}
        </div>
    )
}
