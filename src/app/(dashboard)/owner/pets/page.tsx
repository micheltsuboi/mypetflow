'use client'

import { useState, useEffect, useCallback, Suspense, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import {
    createPet,
    updatePet,
    deletePet,
    getHotelHistory,
    getCrecheHistory
} from '@/app/actions/pet'
import { getPetAssessment } from '@/app/actions/petAssessment'
import PetAssessmentForm from '@/components/PetAssessmentForm'
import { getPetPackagesWithUsage, sellPackageToPet } from '@/app/actions/package'
import { getPetshopHistory, payPetshopSale } from '@/app/actions/petshop'
import {
    getVeterinarians,
    getVetConsultations,
    createVetConsultation,
    updateVetConsultation,
    deleteVetConsultation,
    getVetRecords,
    createVetRecord,
    startConsultation,
    createBlankConsultation,
    getVetAlertsByPet
} from '@/app/actions/veterinary'
import ConsultationModal from '@/components/modules/ConsultationModal'
import ImageUpload from '@/components/ImageUpload'
import PlanGuard from '@/components/modules/PlanGuard'

interface Pet {
    id: string
    name: string
    species: string
    breed?: string
    gender: string
    size: string
    weight_kg?: number
    birth_date?: string
    is_neutered: boolean
    is_adapted?: boolean
    existing_conditions?: string
    vaccination_up_to_date: boolean
    photo_url?: string
    customer_id: string
    customers: {
        id: string
        name: string
        org_id: string
    }
}

function PetsContent() {
    // The provided snippet for console.log seems to be intended for the `updatePet` action function,
    // which is imported from '@/app/actions/pet'. Placing it directly here with `formData`
    // would result in a syntax error as `formData` is not defined in this scope.
    // If you wish to debug the `updatePet` action, please add the console.log inside the `updatePet`
    // function definition in `app/actions/pet.ts`.
    // For now, I will skip adding the console.log as it would break the current file.

    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [pets, setPets] = useState<Pet[]>([])
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [showModal, setShowModal] = useState(false)
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [planFeatures, setPlanFeatures] = useState<string[]>([])
    const [vetAlertsForPet, setVetAlertsForPet] = useState<any[]>([])

    // Veterinary State
    const [vetConsultations, setVetConsultations] = useState<any[]>([])
    const [vetRecords, setVetRecords] = useState<any[]>([])
    const [veterinarians, setVeterinarians] = useState<any[]>([])
    const [currentVet, setCurrentVet] = useState<any>(null)
    const [showConsultationModal, setShowConsultationModal] = useState(false)
    const [activeConsultation, setActiveConsultation] = useState<any | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)

    // Other State
    const [availablePackages, setAvailablePackages] = useState<any[]>([])
    const [selectedPackageId, setSelectedPackageId] = useState('')
    const [isSelling, setIsSelling] = useState(false)
    const [petPackages, setPetPackages] = useState<any[]>([])
    const [hotelHistory, setHotelHistory] = useState<any[]>([])
    const [crecheHistory, setCrecheHistory] = useState<any[]>([])
    const [petshopHistory, setPetshopHistory] = useState<any[]>([])
    const [petAssessment, setPetAssessment] = useState<any>(null)

    const isReadOnly = !currentVet && (userRole === 'owner' || userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff')

    // Accordion State
    const [accordions, setAccordions] = useState({
        details: false,
        packages: false,
        creche: false,
        hotel: false,
        assessment: false,
        vaccines: false,
        petshop: false,
        medical: false,
        exams: false,
        vetAlerts: false
    })

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return 'N/A'
        const birth = new Date(birthDate)
        const now = new Date()
        let years = now.getFullYear() - birth.getFullYear()
        let months = now.getMonth() - birth.getMonth()
        if (months < 0) {
            years--
            months += 12
        }
        if (years === 0) return `${months} meses`
        if (years === 1) return months > 0 ? `1 ano e ${months} m` : `1 ano`
        return `${years} anos`
    }

    const toggleAccordion = async (key: keyof typeof accordions) => {
        setAccordions(prev => ({ ...prev, [key]: !prev[key] }))

        const isOpen = !accordions[key]
        if (isOpen && selectedPet) {
            if (key === 'assessment') {
                getPetAssessment(selectedPet.id).then(setPetAssessment)
            }
            if (key === 'packages') {
                getPetPackagesWithUsage(selectedPet.id).then(setPetPackages)
            }
            if (key === 'creche') {
                getCrecheHistory(selectedPet.id).then((r: any) => setCrecheHistory(r.data || []))
            }
            if (key === 'hotel') {
                getHotelHistory(selectedPet.id).then((r: any) => setHotelHistory(r.data || []))
            }
            if (key === 'petshop') {
                getPetshopHistory(selectedPet.id).then((r: any) => setPetshopHistory(r.data || []))
            }
            if (key === 'medical') {
                getVetConsultations(selectedPet.id).then(setVetConsultations)
                getVetRecords(selectedPet.id).then(setVetRecords)
            }
            if (key === 'vetAlerts') {
                getVetAlertsByPet(selectedPet.id).then(setVetAlertsForPet)
            }
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id, role')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            // Resolvendo de forma paralela usando Promise.all para melhorar a performance da listagem
            const featuresPromise = profile.role === 'superadmin' ? Promise.resolve().then(() => {
                setPlanFeatures(['financeiro', 'petshop', 'creche', 'hospedagem', 'agenda', 'ponto', 'critica_vet', 'pacotes', 'servicos', 'pets', 'tutores', 'usuarios', 'clinica_vet']);
            }) : supabase.from('organizations').select('saas_plans(features)').eq('id', profile.org_id).maybeSingle().then(({ data: org }) => {
                if (org?.saas_plans) setPlanFeatures((org.saas_plans as any).features || []);
            });

            // Constrói a query dos Pets
            let query = supabase.from('pets').select(`
                    id, name, species, breed, gender, size, weight_kg, birth_date, is_neutered,
                    existing_conditions, vaccination_up_to_date, customer_id, photo_url, is_adapted,
                    customers!inner ( id, name, org_id )
                `).eq('customers.org_id', profile.org_id).order('name')
            if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`)
            else query = query.limit(50)

            const petsPromise = query.then(({ data: petsData }) => {
                if (petsData) setPets(petsData as unknown as Pet[])
            })

            const customersPromise = supabase.from('customers').select('id, name').eq('org_id', profile.org_id).order('name').then(({ data: customersData }) => {
                if (customersData) setCustomers(customersData)
            })

            const packagesPromise = supabase.from('service_packages').select('id, name, total_price, description').eq('org_id', profile.org_id).eq('is_active', true).order('total_price').then(({ data: packagesData }) => {
                if (packagesData) setAvailablePackages(packagesData)
            })

            const vetsPromise = getVeterinarians().then(vetsData => {
                setVeterinarians(vetsData)
                const currentVetAccount = vetsData.find(v => (v as any).user_id === user.id)
                if (currentVetAccount) setCurrentVet(currentVetAccount)
            })

            if (profile) setUserRole(profile.role)

            await Promise.all([featuresPromise, petsPromise, customersPromise, packagesPromise, vetsPromise])

        } catch (error) {
            console.error('Erro ao buscar dados:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase, searchTerm])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSelectPet = useCallback(async (pet: Pet) => {
        setSelectedPet(pet)
        setAccordions({
            details: false, packages: false, creche: false, hotel: false,
            assessment: false, vaccines: false, petshop: false,
            medical: false, exams: false, vetAlerts: false
        })
        setPetAssessment(null)
        setShowModal(true)
    }, [])

    const handleNewPet = () => {
        setSelectedPet(null)
        setPetAssessment(null)
        setAccordions({
            details: true, packages: false, creche: false, hotel: false,
            assessment: false, vaccines: false, petshop: false,
            medical: false, exams: false, vetAlerts: false
        })
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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>🐾 Gestão de Pets</h1>
                    <p className={styles.subtitle}>Gerencie os animais cadastrados no sistema</p>
                </div>
                <button className={styles.addButton} onClick={handleNewPet}>
                    + Novo Pet
                </button>
            </div>

            <div className={styles.actionGroup} style={{ marginBottom: '1rem', width: '100%' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar pet por nome ou raça..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.input}
                    style={{ width: '100%' }}
                />
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Pet</th>
                            <th>Tutor</th>
                            <th>Info</th>
                            <th>Idade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pets.map(pet => (
                            <tr key={pet.id} onClick={() => handleSelectPet(pet)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {pet.photo_url ? (
                                            <img src={pet.photo_url} alt={pet.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                {pet.species === 'cat' ? '🐱' : '🐶'}
                                            </div>
                                        )}
                                        <div>
                                            <div className={styles.itemName}>{pet.name}</div>
                                            <div className={styles.itemSub}>{pet.breed}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{pet.customers?.name}</td>
                                <td>{pet.gender === 'male' ? 'Macho' : 'Fêmea'} • {pet.size}</td>
                                <td>{calculateAge(pet.birth_date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{selectedPet ? `Ficha Pet: ${selectedPet.name}` : 'Novo Pet'}</h2>
                            <button onClick={() => setShowModal(false)} className={styles.closeBtn}>&times;</button>
                        </div>

                        <div className={styles.modalContent} style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)', padding: '1rem' }}>

                            {/* DADOS CADASTRAIS */}
                            <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('details')} className={styles.accordionHeader}>
                                    <span>👤 Dados Cadastrais</span>
                                    <span>{accordions.details ? '−' : '+'}</span>
                                </button>
                                {accordions.details && (
                                    <div className={styles.accordionContent}>
                                        <form action={async (formData) => {
                                            const initialState = { message: '', success: false }
                                            const res = selectedPet ? await updatePet(initialState, formData) : await createPet(initialState, formData)
                                            if (res.success) {
                                                alert(res.message)
                                                setShowModal(false)
                                                fetchData()
                                            } else alert(res.message)
                                        }}>
                                            {selectedPet && <input type="hidden" name="id" value={selectedPet.id} />}
                                            <div className={styles.formGrid}>
                                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                                                    <ImageUpload bucket="pets" url={selectedPet?.photo_url} onUpload={(url) => {
                                                        const el = document.getElementById('photo_url_inp') as HTMLInputElement
                                                        if (el) el.value = url
                                                    }} onRemove={() => {
                                                        const el = document.getElementById('photo_url_inp') as HTMLInputElement
                                                        if (el) el.value = ''
                                                    }} label="Foto do Pet" circle />
                                                    <input type="hidden" id="photo_url_inp" name="photo_url" defaultValue={selectedPet?.photo_url || ''} />
                                                </div>
                                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                                    <label>Tutor *</label>
                                                    <select name="customerId" className={styles.select} required defaultValue={selectedPet?.customer_id || ''}>
                                                        <option value="">Selecione...</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                                    <label>Nome *</label>
                                                    <input name="name" className={styles.input} required defaultValue={selectedPet?.name || ''} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Espécie *</label>
                                                    <select name="species" className={styles.select} required defaultValue={selectedPet?.species || 'dog'}>
                                                        <option value="dog">Cão</option>
                                                        <option value="cat">Gato</option>
                                                        <option value="other">Outro</option>
                                                    </select>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Raça</label>
                                                    <input name="breed" className={styles.input} defaultValue={selectedPet?.breed || ''} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Sexo *</label>
                                                    <select name="gender" className={styles.select} required defaultValue={selectedPet?.gender || 'male'}>
                                                        <option value="male">Macho</option>
                                                        <option value="female">Fêmea</option>
                                                    </select>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Porte *</label>
                                                    <select name="size" className={styles.select} required defaultValue={selectedPet?.size || 'medium'}>
                                                        <option value="small">Pequeno</option>
                                                        <option value="medium">Médio</option>
                                                        <option value="large">Grande</option>
                                                        <option value="giant">Gigante</option>
                                                    </select>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Nascimento</label>
                                                    <input name="birthDate" type="date" className={styles.input} defaultValue={selectedPet?.birth_date || ''} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Peso (kg)</label>
                                                    <input name="weight" type="number" step="0.1" className={styles.input} defaultValue={selectedPet?.weight_kg || ''} />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label><input type="checkbox" name="isNeutered" defaultChecked={selectedPet?.is_neutered} /> Castrado</label>
                                                    <label style={{ marginLeft: '1rem' }}><input type="checkbox" name="vaccination_up_to_date" defaultChecked={selectedPet?.vaccination_up_to_date} /> Vacinas em dia</label>
                                                    <label style={{ marginLeft: '1rem', color: 'var(--primary)' }}><input type="checkbox" name="is_adapted" defaultChecked={selectedPet?.is_adapted} /> Adaptado (Creche/Hotel)</label>
                                                </div>
                                            </div>
                                            <div className={styles.formActions} style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                                {selectedPet && <button type="button" onClick={handleDelete} className={styles.deleteBtn}>Excluir</button>}
                                                <button type="submit" className={styles.submitButton}>{selectedPet ? 'Salvar' : 'Cadastrar'}</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* FICHA MÉDICA */}
                            {planFeatures.includes('clinica_vet') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('medical')} className={styles.accordionHeader}>
                                        <span>🩺 Ficha Médica (Consultas)</span>
                                        <span>{accordions.medical ? '−' : '+'}</span>
                                    </button>
                                    {accordions.medical && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0 }}>Histórico de Atendimentos</h4>
                                                {!isReadOnly && (
                                                    <button className={styles.addButton} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={async () => {
                                                        if (!selectedPet) return
                                                        const res = await createBlankConsultation(selectedPet.id)
                                                        if (res.success) {
                                                            setActiveConsultation(res.data)
                                                            setShowConsultationModal(true)
                                                        }
                                                    }}>+ Nova Consulta</button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {vetConsultations.length === 0 ? <p>Nenhuma consulta registrada.</p> : vetConsultations.map(c => (
                                                    <div key={c.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong>{new Date(c.consultation_date).toLocaleDateString()} - {c.veterinarians?.name || 'VET'}</strong>
                                                            <button className={styles.actionBtn} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setActiveConsultation(c); setShowConsultationModal(true); }}>Abrir</button>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{c.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AVALIAÇÃO */}
                            <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('assessment')} className={styles.accordionHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>📋 Avaliação Comportamental</span>
                                        {petAssessment && <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>FEITA</span>}
                                    </div>
                                    <span>{accordions.assessment ? '−' : '+'}</span>
                                </button>
                                {accordions.assessment && (
                                    <div className={styles.accordionContent}>
                                        <PetAssessmentForm
                                            petId={selectedPet!.id}
                                            existingData={petAssessment}
                                            onSuccess={() => {
                                                getPetAssessment(selectedPet!.id).then(setPetAssessment)
                                                alert('Avaliação salva com sucesso!')
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* PACOTES */}
                            {planFeatures.includes('pacotes') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('packages')} className={styles.accordionHeader}>
                                        <span>📦 Pacotes do Pet</span>
                                        <span>{accordions.packages ? '−' : '+'}</span>
                                    </button>
                                    {accordions.packages && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                                <h4>Ativar Novo Pacote</h4>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <select className={styles.select} value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
                                                        <option value="">Selecione um pacote...</option>
                                                        {availablePackages.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.total_price.toFixed(2)}</option>)}
                                                    </select>
                                                    <button className={styles.addButton} disabled={!selectedPackageId || isSelling} onClick={async () => {
                                                        if (!selectedPet || !selectedPackageId) return
                                                        setIsSelling(true)
                                                        const pkg = availablePackages.find(p => p.id === selectedPackageId)
                                                        const res = await sellPackageToPet(selectedPet.id, selectedPackageId, pkg.total_price, 'pix')
                                                        if (res.success) {
                                                            alert(res.message)
                                                            getPetPackagesWithUsage(selectedPet.id).then(setPetPackages)
                                                            setSelectedPackageId('')
                                                        } else alert(res.message)
                                                        setIsSelling(false)
                                                    }}>{isSelling ? '...' : 'Ativar'}</button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {petPackages.length === 0 ? <p>Nenhum pacote ativo.</p> : petPackages.map((pkg: any, idx: number) => (
                                                    <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                            <span>{pkg.package_name}: {pkg.service_name}</span>
                                                            <span style={{ color: pkg.remaining_qty > 0 ? '#10B981' : '#EF4444' }}>{pkg.remaining_qty} / {pkg.total_qty}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                            Expira em: {pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : 'Nunca'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CRECHE */}
                            {planFeatures.includes('creche') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('creche')} className={styles.accordionHeader}>
                                        <span>🎾 Histórico de Creche</span>
                                        <span>{accordions.creche ? '−' : '+'}</span>
                                    </button>
                                    {accordions.creche && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {crecheHistory.length === 0 ? <p>Nenhuma visita técnica registrada.</p> : crecheHistory.map((h: any) => (
                                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                        <span>{new Date(h.scheduled_at).toLocaleDateString()}</span>
                                                        <span style={{ fontWeight: 600 }}>{h.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* HOTEL */}
                            {planFeatures.includes('hospedagem') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('hotel')} className={styles.accordionHeader}>
                                        <span>🏠 Histórico de Hospedagem</span>
                                        <span>{accordions.hotel ? '−' : '+'}</span>
                                    </button>
                                    {accordions.hotel && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {hotelHistory.length === 0 ? <p>Nenhuma hospedagem registrada.</p> : hotelHistory.map((h: any) => (
                                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                        <span>{new Date(h.scheduled_at).toLocaleDateString()}</span>
                                                        <span style={{ fontWeight: 600 }}>{h.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ALERTAS VETERINÁRIOS */}
                            <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('vetAlerts' as any)} className={styles.accordionHeader}>
                                    <span>🚨 Alertas Veterinários</span>
                                    <span>{accordions.vetAlerts ? '−' : '+'}</span>
                                </button>
                                {accordions.vetAlerts && (
                                    <div className={styles.accordionContent}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {vetAlertsForPet.length === 0 ? <p>Nenhum alerta registrado.</p> : vetAlertsForPet.map((alert: any) => (
                                                <div key={alert.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', borderLeft: `4px solid ${alert.status === 'pending' ? '#EF4444' : '#10B981'}` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: 600 }}>Alerta #{alert.id.slice(0, 8)}</div>
                                                        <div style={{ fontWeight: 600, color: alert.status === 'pending' ? '#EF4444' : '#10B981' }}>
                                                            {alert.status === 'pending' ? 'Pendente' : alert.status === 'scheduled' ? 'Agendado' : 'Lido'}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{alert.observation}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                        <div>{new Date(alert.created_at).toLocaleDateString()} as {new Date(alert.created_at).toLocaleTimeString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PETSHOP */}
                            {planFeatures.includes('petshop') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('petshop')} className={styles.accordionHeader}>
                                        <span>🛍️ Histórico de Compras (Petshop)</span>
                                        <span>{accordions.petshop ? '−' : '+'}</span>
                                    </button>
                                    {accordions.petshop && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {petshopHistory.length === 0 ? <p>Nenhuma compra registrada.</p> : petshopHistory.map((sale: any) => (
                                                    <div key={sale.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', borderLeft: `4px solid ${sale.payment_status === 'paid' ? '#10B981' : '#EF4444'}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <div style={{ fontWeight: 600 }}>Venda #{sale.id.slice(0, 8)}</div>
                                                            <div style={{ fontWeight: 600 }}>R$ {sale.total_amount.toFixed(2)}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                            <div>{new Date(sale.created_at).toLocaleDateString()} • {sale.payment_status === 'paid' ? 'Pago' : 'Pendente'}</div>
                                                            {sale.payment_status === 'pending' && (
                                                                <button className={styles.actionBtn} onClick={async () => {
                                                                    const method = prompt('Qual a forma de pagamento? (pix, cash, credit, debit)', 'pix')
                                                                    if (method) {
                                                                        const res = await payPetshopSale(sale.id, method)
                                                                        if (res.success) {
                                                                            alert(res.message)
                                                                            getPetshopHistory(selectedPet!.id).then(r => setPetshopHistory(r.data || []))
                                                                        } else alert(res.message)
                                                                    }
                                                                }}>💵 Pagar</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {showConsultationModal && activeConsultation && (
                <ConsultationModal
                    consultation={activeConsultation}
                    readOnly={isReadOnly}
                    onClose={() => {
                        setShowConsultationModal(false);
                        if (selectedPet) getVetConsultations(selectedPet.id).then(setVetConsultations);
                    }}
                />
            )}
        </div>
    )
}

export default function PetsPage() {
    return (
        <PlanGuard requiredModule="pets">
            <Suspense fallback={<div>Carregando...</div>}>
                <PetsContent />
            </Suspense>
        </PlanGuard>
    )
}
