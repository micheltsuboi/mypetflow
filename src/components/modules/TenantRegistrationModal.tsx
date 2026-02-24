'use client'

import { useState } from 'react'
import { createTenant } from '@/app/actions/master-admin'
import styles from './TenantRegistrationModal.module.css'
import { SaasPlan } from '@/app/actions/plans'

interface Props {
    onClose: () => void
    onSuccess: () => void
    plans: SaasPlan[]
}

export default function TenantRegistrationModal({ onClose, onSuccess, plans }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const result = await createTenant(formData)

        if (result.success) {
            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
        } else {
            setError(result.message || 'Erro ao cadastrar empresa.')
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Cadastrar Nova Loja / Cliente</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={`${styles.msg} ${styles.error}`}>{error}</div>}
                    {success && <div className={`${styles.msg} ${styles.success}`}>Empresa cadastrada com sucesso!</div>}

                    <div className={styles.sectionHeader}>Dados da Organização</div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome do Pet Shop / Empresa *</label>
                        <input name="orgName" required className={styles.input} placeholder="Ex: Sr Pet Shop" />
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Subdomínio (identificador) *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input name="subdomain" required className={styles.input} placeholder="ex: srpet" style={{ flex: 1 }} />
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>.mypetflow.com.br</span>
                        </div>
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Plano de Assinatura *</label>
                        <select name="planId" required className={styles.input}>
                            <option value="">Selecione o plano inicial...</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name} {plan.price ? `- R$ ${plan.price}/mês` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.sectionHeader}>Usuário Administrador</div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome Completo *</label>
                        <input name="adminName" required className={styles.input} placeholder="Ex: João da Silva" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>E-mail de Acesso *</label>
                        <input name="adminEmail" type="email" required className={styles.input} placeholder="admin@email.com" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Senha de Acesso *</label>
                        <input name="adminPassword" type="password" required className={styles.input} placeholder="••••••••" minLength={6} />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading || success}>
                        {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                    </button>
                </form>
            </div>
        </div>
    )
}
