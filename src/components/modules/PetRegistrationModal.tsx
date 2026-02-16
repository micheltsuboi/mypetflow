'use client'

import { useActionState, useEffect } from 'react'
import { createPetByTutor } from '@/app/actions/pet'
import styles from './PetRegistrationModal.module.css'

const initialState = {
    message: '',
    success: false
}

export default function PetRegistrationModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [state, formAction, isPending] = useActionState(createPetByTutor, initialState)

    useEffect(() => {
        if (state.success) {
            const timer = setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [state, onSuccess, onClose])

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Cadastrar Novo Pet</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                {state.message && (
                    <div className={`${styles.msg} ${state.success ? styles.success : styles.error}`}>
                        {state.message}
                    </div>
                )}

                <form action={formAction} className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome do Pet *</label>
                        <input name="name" required className={styles.input} placeholder="Ex: Rex" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Espécie *</label>
                        <select name="species" className={styles.select} required defaultValue="dog">
                            <option value="dog">Cão</option>
                            <option value="cat">Gato</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Raça</label>
                        <input name="breed" className={styles.input} placeholder="Ex: Vira-lata" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Sexo *</label>
                        <select name="gender" className={styles.select} required defaultValue="male">
                            <option value="male">Macho</option>
                            <option value="female">Fêmea</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Porte *</label>
                        <select name="size" className={styles.select} required defaultValue="medium">
                            <option value="small">Pequeno</option>
                            <option value="medium">Médio</option>
                            <option value="large">Grande</option>
                            <option value="giant">Gigante</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Data de Nascimento</label>
                        <input name="birthDate" type="date" className={styles.input} />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Peso (kg)</label>
                        <input name="weight" type="number" step="0.1" className={styles.input} placeholder="0.0" />
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="checkbox" name="isNeutered" /> É castrado?
                        </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="checkbox" name="vaccination_up_to_date" /> Vacinação em dia?
                        </label>
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Condições de Saúde (Opcional)</label>
                        <textarea name="existing_conditions" className={styles.input} rows={2} placeholder="Ex: Alergia a frango..." />
                    </div>

                    <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={isPending}>
                        {isPending ? 'Salvando...' : 'Cadastrar Pet'}
                    </button>
                    {!state.success && (
                        <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', gridColumn: '1/-1' }}>
                            * Você não poderá editar ou excluir estas informações depois. Caso precise, contate o staff.
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
