'use client'

import { useState } from 'react'
import { SaasPlan } from '@/app/actions/plans'
import { changeTenantPlan } from '@/app/actions/master-admin'
import { OrganizationData } from '@/app/actions/master-admin'
import styles from './TenantRegistrationModal.module.css' // Reutilizando os estilos

interface Props {
    tenant: OrganizationData
    plans: SaasPlan[]
    onClose: () => void
    onSuccess: () => void
}

export default function EditTenantPlanModal({ tenant, plans, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // A action que iremos usar
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const planId = formData.get('planId') as string

        const result = await changeTenantPlan(tenant.id, planId)

        if (result.success) {
            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1000)
        } else {
            setError(result.message || 'Erro ao alterar o plano.')
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Alterar Plano: {tenant.name}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={`${styles.msg} ${styles.error}`}>{error}</div>}
                    {success && <div className={`${styles.msg} ${styles.success}`}>Plano alterado com sucesso!</div>}

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Novo Plano de Assinatura *</label>
                        <select
                            name="planId"
                            required
                            className={styles.input}
                            defaultValue={tenant.plan_id || ''}
                        >
                            <option value="">Selecione um plano...</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name} {plan.price ? `- R$ ${plan.price}/mês` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading || success} style={{ marginTop: '1.5rem' }}>
                        {loading ? 'Salvando...' : 'Salvar Alteração'}
                    </button>
                </form>
            </div>
        </div>
    )
}
