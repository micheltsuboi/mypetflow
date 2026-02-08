'use client'

import { useState, useEffect, useCallback, useActionState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { createTutor } from '@/app/actions/tutor'

// Interface for Customer
interface Customer {
    id: string
    name: string
    email: string | null
    phone_1: string | null
    address: string | null
    neighborhood: string | null
    city: string | null
    instagram: string | null
    birth_date: string | null
    created_at: string
}

const initialState = {
    message: '',
    success: false
}

export default function TutorsPage() {
    const supabase = createClient()
    const [tutors, setTutors] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    // Server Action State
    const [state, formAction, isPending] = useActionState(createTutor, initialState)

    const fetchTutors = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('org_id', profile.org_id)
                .order('name')

            if (error) throw error
            if (data) setTutors(data)
        } catch (error) {
            console.error('Erro ao buscar tutores:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchTutors()
    }, [fetchTutors])

    useEffect(() => {
        if (state.success) {
            setShowModal(false)
            fetchTutors()
            alert(state.message)
        } else if (state.message) {
            alert(state.message) // Simple error feedback
        }
    }, [state, fetchTutors])

    if (loading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Carregando tutores...</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                    <h1 className={styles.title}>👤 Gestão de Tutores</h1>
                    <p className={styles.subtitle}>Cadastre e gerencie os clientes do pet shop</p>
                </div>
                <button className={styles.addButton} onClick={() => setShowModal(true)}>
                    + Novo Tutor
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tutor</th>
                            <th>Contato</th>
                            <th>Endereço</th>
                            <th>Desde</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tutors.map(tutor => (
                            <tr key={tutor.id}>
                                <td>
                                    <div className={styles.userInfo}>
                                        <div className={styles.avatar}>
                                            {tutor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className={styles.userName}>{tutor.name}</span>
                                            {tutor.instagram && <span style={{ fontSize: '0.8rem', color: '#ec4899' }}>@{tutor.instagram.replace('@', '')}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.9rem' }}>📞 {tutor.phone_1}</span>
                                        <span className={styles.userEmail}>✉️ {tutor.email}</span>
                                        {tutor.birth_date && (
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>🎂 {new Date(tutor.birth_date).toLocaleDateString('pt-BR')}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                        {tutor.address && <div>{tutor.address}</div>}
                                        {(tutor.neighborhood || tutor.city) && (
                                            <div style={{ fontSize: '0.8rem' }}>
                                                {tutor.neighborhood}{tutor.neighborhood && tutor.city ? ' - ' : ''}{tutor.city}
                                            </div>
                                        )}
                                        {!tutor.address && !tutor.neighborhood && !tutor.city && '-'}
                                    </div>
                                </td>
                                <td>
                                    {new Date(tutor.created_at).toLocaleDateString('pt-BR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tutors.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Nenhum tutor cadastrado.</p>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Tutor</h2>

                        <form action={formAction}>
                            <div className={styles.formGrid}>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="name" className={styles.label}>Nome Completo *</label>
                                    <input id="name" name="name" type="text" className={styles.input} required placeholder="Ex: Maria Souza" />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="email" className={styles.label}>Email *</label>
                                    <input id="email" name="email" type="email" className={styles.input} required placeholder="maria@email.com" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="password" className={styles.label}>Senha de Acesso *</label>
                                    <input id="password" name="password" type="password" className={styles.input} required placeholder="******" minLength={6} />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="phone" className={styles.label}>Telefone/WhatsApp *</label>
                                    <input id="phone" name="phone" type="tel" className={styles.input} required placeholder="(11) 99999-9999" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="birthDate" className={styles.label}>Data de Nascimento</label>
                                    <input id="birthDate" name="birthDate" type="date" className={styles.input} />
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="address" className={styles.label}>Endereço</label>
                                    <input id="address" name="address" type="text" className={styles.input} placeholder="Rua das Flores, 123" />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="neighborhood" className={styles.label}>Bairro</label>
                                    <input id="neighborhood" name="neighborhood" type="text" className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="city" className={styles.label}>Cidade</label>
                                    <input id="city" name="city" type="text" className={styles.input} defaultValue="São Paulo" />
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="instagram" className={styles.label}>Instagram</label>
                                    <input id="instagram" name="instagram" type="text" className={styles.input} placeholder="@usuario" />
                                </div>
                            </div>

                            {state.message && !state.success && (
                                <p style={{ color: 'red', marginTop: '1rem' }}>{state.message}</p>
                            )}

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.submitButton} disabled={isPending}>
                                    {isPending ? 'Cadastrando...' : 'Cadastrar Tutor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
