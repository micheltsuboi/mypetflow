'use client'

import { useState, useEffect, useCallback, useActionState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { createPet, updatePet, deletePet } from '@/app/actions/pet'

// Interfaces
interface Pet {
    id: string
    name: string
    species: 'dog' | 'cat' | 'other'
    breed: string | null
    gender: 'male' | 'female'
    size: 'small' | 'medium' | 'large' | 'giant' | null
    birth_date: string | null
    weight_kg: number | null
    is_neutered: boolean
    customer_id: string
    customers: {
        name: string
    } | null
}

interface Customer {
    id: string
    name: string
}

const initialState = {
    message: '',
    success: false
}

export default function PetsPage() {
    const supabase = createClient()
    const [pets, setPets] = useState<Pet[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null)

    // Server Action State
    const [createState, createAction, isCreatePending] = useActionState(createPet, initialState)
    const [updateState, updateAction, isUpdatePending] = useActionState(updatePet, initialState)

    const isPending = isCreatePending || isUpdatePending

    const fetchData = useCallback(async () => {
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

            // Fetch Pets
            const { data: petsData, error: petsError } = await supabase
                .from('pets')
                .select('*, customers(name)')
                .order('name')

            if (petsError) throw petsError

            // Fetch Customers for select
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select('id, name')
                .eq('org_id', profile.org_id)
                .order('name')

            if (customersError) throw customersError

            if (petsData) setPets(petsData as unknown as Pet[])
            if (customersData) setCustomers(customersData)

        } catch (error) {
            console.error('Erro ao buscar dados:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Feedback handling
    useEffect(() => {
        if (createState.success) {
            setShowModal(false)
            fetchData()
            alert(createState.message)
        } else if (createState.message) {
            alert(createState.message)
        }
    }, [createState, fetchData])

    useEffect(() => {
        if (updateState.success) {
            setShowModal(false)
            setSelectedPet(null)
            fetchData()
            alert(updateState.message)
        } else if (updateState.message) {
            alert(updateState.message)
        }
    }, [updateState, fetchData])

    const handleRowClick = (pet: Pet) => {
        setSelectedPet(pet)
        setShowModal(true)
    }

    const handleNewPet = () => {
        setSelectedPet(null)
        setShowModal(true)
    }

    const handleDelete = async () => {
        if (!selectedPet) return
        if (!confirm(`Tem certeza que deseja excluir o pet ${selectedPet.name}?`)) return

        const res = await deletePet(selectedPet.id)
        if (res.success) {
            alert(res.message)
            setShowModal(false)
            setSelectedPet(null)
            fetchData()
        } else {
            alert(res.message)
        }
    }

    if (loading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Carregando pets...</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                    <h1 className={styles.title}>🐾 Gestão de Pets</h1>
                    <p className={styles.subtitle}>Gerencie os animais cadastrados no sistema</p>
                </div>
                <button className={styles.addButton} onClick={handleNewPet}>
                    + Novo Pet
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Pet</th>
                            <th>Tutor</th>
                            <th>Características</th>
                            <th>Idade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pets.map(pet => (
                            <tr key={pet.id} onClick={() => handleRowClick(pet)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className={styles.itemInfo}>
                                        <div className={styles.avatar}>
                                            {pet.species === 'cat' ? '🐱' : '🐶'}
                                        </div>
                                        <div>
                                            <span className={styles.itemName}>{pet.name}</span>
                                            <span className={styles.itemSub}>{pet.breed || 'Sem raça definida'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.itemName} style={{ fontSize: '0.9rem' }}>
                                        {pet.customers?.name || 'Tutor não encontrado'}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.itemSub}>
                                        {pet.gender === 'male' ? 'Macho' : 'Fêmea'} • {
                                            pet.size === 'small' ? 'Pequeno' :
                                                pet.size === 'medium' ? 'Médio' :
                                                    pet.size === 'large' ? 'Grande' : 'Gigante'
                                        }
                                        {pet.is_neutered && ' • Castrado'}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.itemSub}>
                                        {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString('pt-BR') : '-'}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pets.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Nenhum pet cadastrado.</p>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem' }}>
                            {selectedPet ? 'Editar Pet' : 'Cadastrar Novo Pet'}
                        </h2>

                        <form action={selectedPet ? updateAction : createAction}>
                            {selectedPet && <input type="hidden" name="id" value={selectedPet.id} />}

                            <div className={styles.formGrid}>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="customerId" className={styles.label}>Tutor *</label>
                                    <select
                                        id="customerId" name="customerId" className={styles.select} required
                                        defaultValue={selectedPet?.customer_id || ''}
                                    >
                                        <option value="">Selecione um tutor...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="name" className={styles.label}>Nome do Pet *</label>
                                    <input
                                        id="name" name="name" type="text" className={styles.input} required
                                        placeholder="Ex: Rex"
                                        defaultValue={selectedPet?.name || ''}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="species" className={styles.label}>Espécie *</label>
                                    <select
                                        id="species" name="species" className={styles.select} required
                                        defaultValue={selectedPet?.species || 'dog'}
                                    >
                                        <option value="dog">Cão</option>
                                        <option value="cat">Gato</option>
                                        <option value="other">Outro</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="breed" className={styles.label}>Raça</label>
                                    <input
                                        id="breed" name="breed" type="text" className={styles.input}
                                        placeholder="Ex: Labrador"
                                        defaultValue={selectedPet?.breed || ''}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="gender" className={styles.label}>Sexo *</label>
                                    <select
                                        id="gender" name="gender" className={styles.select} required
                                        defaultValue={selectedPet?.gender || 'male'}
                                    >
                                        <option value="male">Macho</option>
                                        <option value="female">Fêmea</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="size" className={styles.label}>Porte *</label>
                                    <select
                                        id="size" name="size" className={styles.select} required
                                        defaultValue={selectedPet?.size || 'medium'}
                                    >
                                        <option value="small">Pequeno</option>
                                        <option value="medium">Médio</option>
                                        <option value="large">Grande</option>
                                        <option value="giant">Gigante</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="birthDate" className={styles.label}>Data de Nascimento</label>
                                    <input
                                        id="birthDate" name="birthDate" type="date" className={styles.input}
                                        defaultValue={selectedPet?.birth_date || ''}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="weight" className={styles.label}>Peso (kg)</label>
                                    <input
                                        id="weight" name="weight" type="number" step="0.1" className={styles.input}
                                        placeholder="0.0"
                                        defaultValue={selectedPet?.weight_kg?.toString() || ''}
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox" name="isNeutered"
                                            defaultChecked={selectedPet?.is_neutered || false}
                                        />
                                        É castrado?
                                    </label>
                                </div>
                            </div>

                            <div className={styles.modalActions} style={{ justifyContent: 'space-between' }}>
                                <div>
                                    {selectedPet && (
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            style={{ color: 'red', borderColor: 'red', background: 'rgba(255,0,0,0.05)' }}
                                            onClick={handleDelete}
                                        >
                                            Excluir
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)} disabled={isPending}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={styles.submitButton} disabled={isPending}>
                                        {isPending ? 'Salvando...' : (selectedPet ? 'Salvar Alterações' : 'Cadastrar Pet')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
