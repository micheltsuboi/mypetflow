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
import { getPetAppointmentsByCategory } from '@/app/actions/appointment'
import { getPetAssessment } from '@/app/actions/petAssessment'
import PetAssessmentForm from '@/components/PetAssessmentForm'
import { getPetPackagesWithUsage, sellPackageToPet, cancelCustomerPackage, reschedulePackageSession } from '@/app/actions/package'
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
    getVetAlertsByPet,
    getVetExamTypes,
    getVetExams,
    createVetExam,
    deleteVetExam,
    updateExamPayment
} from '@/app/actions/veterinary'
import ConsultationModal from '@/components/modules/ConsultationModal'
import { getPetAdmissionsHistory, getAllAdmissionMedications } from '@/app/actions/hospital'
import InternmentRecordModal from '@/components/InternmentRecordModal'
import ImageUpload from '@/components/ImageUpload'
import FileUpload from '@/components/ui/FileUpload'
import ExamPaymentControls from '@/components/ExamPaymentControls'
import PlanGuard from '@/components/modules/PlanGuard'
import DateInput from '@/components/ui/DateInput'
import { 
    X, 
    User, 
    Calendar, 
    Dog, 
    History, 
    ClipboardCheck, 
    Package, 
    Activity, 
    Stethoscope, 
    FileText,
    Syringe,
    CreditCard,
    Scissors,
    ShieldAlert,
    Building2,
    DownloadCloud
} from 'lucide-react'
import { jsPDF } from 'jspdf'

import { useDebounce } from '@/hooks/useDebounce'
import TutorSearchSelect from '@/components/ui/TutorSearchSelect'


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
    color?: string
    characteristics?: string
    customer_id: string
    customers: {
        id: string
        name: string
        org_id: string
        phone_1: string | null
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
    const [customers, setCustomers] = useState<{ id: string, name: string, phone_1: string | null }[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [showModal, setShowModal] = useState(false)
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearchTerm = useDebounce(searchTerm, 500)
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
    const [groomingHistory, setGroomingHistory] = useState<any[]>([])
    const [hospitalHistory, setHospitalHistory] = useState<any[]>([])
    const [petExams, setPetExams] = useState<any[]>([])
    const [examTypes, setExamTypes] = useState<any[]>([])
    const [showHospitalModal, setShowHospitalModal] = useState(false)
    const [activeAdmission, setActiveAdmission] = useState<any | null>(null)
    const [admissionMeds, setAdmissionMeds] = useState<any[]>([])
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
        vetAlerts: false,
        hospital: false,
        grooming: false
    })

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return 'N/A'
        const birth = new Date(birthDate + 'T12:00:00')
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
            if (key === 'hospital' as any) {
                getPetAdmissionsHistory(selectedPet.id).then(setHospitalHistory)
            }
            if (key === 'grooming' as any) {
                getPetAppointmentsByCategory(selectedPet.id, 'Banho e Tosa').then(setGroomingHistory)
            }
            if (key === 'exams') {
                getVetExams(selectedPet.id).then(setPetExams)
                getVetExamTypes().then(setExamTypes)
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
                setPlanFeatures(['financeiro', 'petshop', 'creche', 'hospedagem', 'agenda', 'ponto', 'critica_vet', 'pacotes', 'servicos', 'pets', 'tutores', 'usuarios', 'clinica_vet', 'banho_tosa']);
            }) : supabase.from('organizations').select('saas_plans(features)').eq('id', profile.org_id).maybeSingle().then(({ data: org }) => {
                if (org?.saas_plans) setPlanFeatures((org.saas_plans as any).features || []);
            });

            // Constrói a query dos Pets
            let query = supabase.from('pets').select(`
                    id, name, species, breed, gender, size, weight_kg, birth_date, is_neutered,
                    existing_conditions, vaccination_up_to_date, customer_id, photo_url, is_adapted,
                    color, characteristics,
                    customers!inner ( id, name, org_id, phone_1 )
                `).eq('customers.org_id', profile.org_id).order('name')
            if (debouncedSearchTerm) query = query.or(`name.ilike.%${debouncedSearchTerm}%,breed.ilike.%${debouncedSearchTerm}%`)
            else query = query.limit(50)

            const petsPromise = query.then(({ data: petsData }) => {
                if (petsData) setPets(petsData as unknown as Pet[])
            })

            const customersPromise = supabase.from('customers').select('id, name, phone_1').eq('org_id', profile.org_id).order('name').then(({ data: customersData }) => {
                if (customersData) setCustomers(customersData as any)
            })

            const packagesPromise = supabase.from('service_packages').select('id, name, total_price, description, validity_type, validity_weeks').eq('org_id', profile.org_id).eq('is_active', true).order('total_price').then(({ data: packagesData }) => {
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
    }, [supabase, debouncedSearchTerm])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSelectPet = useCallback(async (pet: Pet) => {
        setSelectedPet(pet)
        setAccordions({
            details: false, packages: false, creche: false, hotel: false,
            assessment: false, vaccines: false, petshop: false,
            medical: false, exams: false, vetAlerts: false, hospital: false,
            grooming: false
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
            medical: false, exams: false, vetAlerts: false, hospital: false,
            grooming: false
        })
        setShowModal(true)
    }

    const generatePetPDF = (pet: Pet) => {
        const doc = new jsPDF({
            orientation: 'l',
            unit: 'mm',
            format: [230, 155]
        })

        // Margins and styling
        const margin = 10
        const topSectionHeight = 155 / 3 // Exactly the first third

        // DATA SECTION - ALL BLACK
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        
        let y = 10 // Start higher
        const col1 = margin
        const col2 = 115

        // TUTOR INFO
        doc.setFont('helvetica', 'bold')
        doc.text('DADOS DO TUTOR', col1, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`Nome: ${pet.customers?.name || 'Não informado'}`, col1, y)
        doc.text(`Telefone: ${pet.customers?.phone_1 || 'Não informado'}`, col2, y)
        
        y += 8
        
        // PET INFO
        doc.setFont('helvetica', 'bold')
        doc.text('DADOS DO PET', col1, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        
        // Row 1
        doc.text(`Nome: ${pet.name}`, col1, y)
        doc.text(`Espécie: ${pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : 'Outro'}`, col2, y)
        y += 5
        
        // Row 2
        doc.text(`Raça: ${pet.breed || 'SRD'}`, col1, y)
        doc.text(`Sexo: ${pet.gender === 'male' ? 'Macho' : 'Fêmea'}`, col2, y)
        y += 5

        // Row 3
        const age = calculateAge(pet.birth_date)
        doc.text(`Idade: ${age}`, col1, y)
        doc.text(`Peso: ${pet.weight_kg ? pet.weight_kg + ' kg' : 'N/A'}`, col2, y)
        y += 5

        // Row 4
        doc.text(`Cor: ${pet.color || 'Não informada'}`, col1, y)
        doc.text(`Porte: ${pet.size === 'small' ? 'Pequeno' : pet.size === 'medium' ? 'Médio' : pet.size === 'large' ? 'Grande' : 'Gigante'}`, col2, y)
        y += 5

        // Row 5
        doc.text(`Castrado: ${pet.is_neutered ? 'Sim' : 'Não'}`, col1, y)
        doc.text(`Vacinas em dia: ${pet.vaccination_up_to_date ? 'Sim' : 'Não'}`, col2, y)
        y += 7

        // Row 6 (Conditions)
        const conditions = pet.characteristics || pet.existing_conditions || 'Nenhuma'
        doc.setFont('helvetica', 'bold')
        doc.text('Observações / Características:', col1, y)
        y += 4
        doc.setFont('helvetica', 'normal')
        const splitText = doc.splitTextToSize(conditions, 210)
        doc.text(splitText, col1, y)

        // Bottom border for the data section (optional, but requested black if used)
        doc.setDrawColor(0, 0, 0)
        doc.line(margin, topSectionHeight, 220, topSectionHeight)
        
        doc.setFontSize(7)
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, margin, topSectionHeight - 2)

        // Print / Auto-open print dialog
        doc.autoPrint()
        const pdfBlob = doc.output('blob')
        const url = URL.createObjectURL(pdfBlob)
        window.open(url, '_blank')
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
                                            <div className={styles.itemName}>{pet.name} {pet.customers?.name && <span style={{ fontWeight: 400, opacity: 0.8 }}>({pet.customers.name})</span>}</div>
                                            <div className={styles.itemSub}>{pet.breed} {pet.color && `• ${pet.color}`}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {pet.customers?.name} <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({pet.name})</span>
                                        {pet.customers?.phone_1 && (
                                            <a
                                                href={`https://wa.me/55${pet.customers.phone_1.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                title="Abrir WhatsApp"
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    transition: 'transform 0.2s',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                            >
                                                <svg 
                                                    viewBox="0 0 24 24" 
                                                    width="16" 
                                                    height="16" 
                                                    fill="#25D366"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </td>
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
                        <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
                            <X size={24} />
                        </button>
                        <div className={styles.modalHeader}>
                            <h2>{selectedPet ? `Ficha Pet: ${selectedPet.name}` : 'Novo Pet'}</h2>
                            {selectedPet && (
                                <button 
                                    className={styles.actionBtn} 
                                    onClick={() => generatePetPDF(selectedPet)}
                                    title="Imprimir Ficha PDF"
                                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(232, 130, 106, 0.1)', color: 'var(--primary)', border: '1px solid rgba(232, 130, 106, 0.2)', transition: 'all 0.2s ease', position: 'absolute', right: '4rem', top: '1.25rem' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232, 130, 106, 0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                >
                                    <DownloadCloud size={18} />
                                    <span style={{ fontWeight: 600 }}>Imprimir Ficha</span>
                                </button>
                            )}
                        </div>

                        <div className={styles.modalContent}>

                            {/* DADOS CADASTRAIS */}
                            <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('details')} className={styles.accordionHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <User size={18} color="var(--primary)" />
                                        <span>Dados Cadastrais</span>
                                    </div>
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
                                                    <TutorSearchSelect 
                                                        name="customerId" 
                                                        defaultValue={selectedPet?.customer_id} 
                                                        initialTutors={customers} 
                                                        required 
                                                    />
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
                                                    <DateInput
                                                        name="birthDate"
                                                        className={styles.input}
                                                        defaultValue={selectedPet?.birth_date}
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Peso (kg)</label>
                                                    <input name="weight" type="number" step="0.1" className={styles.input} defaultValue={selectedPet?.weight_kg || ''} />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Cor</label>
                                                    <input name="color" className={styles.input} defaultValue={selectedPet?.color || ''} />
                                                </div>
                                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                                    <label>Características / Observações</label>
                                                    <textarea name="characteristics" className={styles.input} rows={3} defaultValue={selectedPet?.characteristics || ''} style={{ resize: 'vertical' }} />
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Stethoscope size={18} color="var(--primary)" />
                                            <span>Ficha Médica (Consultas)</span>
                                        </div>
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

                            {/* EXAMES */}
                            {planFeatures.includes('clinica_vet') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('exams')} className={styles.accordionHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <ClipboardCheck size={18} color="var(--primary)" />
                                            <span>Exames Laboratoriais</span>
                                        </div>
                                        <span>{accordions.exams ? '−' : '+'}</span>
                                    </button>
                                    {accordions.exams && (
                                        <div className={styles.accordionContent}>
                                            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'owner' || currentVet) && (
                                                <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        🧪 Solicitar / Cadastrar Novo Exame
                                                    </h4>
                                                    <form action={async (formData) => {
                                                        const examTypeId = formData.get('exam_type_id') as string
                                                        const selectedType = examTypes.find(t => t.id === examTypeId)
                                                        if (!selectedType) return alert('Selecione um tipo de exame.')
                                                        
                                                        formData.append('exam_type_name', selectedType.name)
                                                        formData.append('price', selectedType.base_price.toString())
                                                        
                                                        const res = await createVetExam(formData)
                                                        if (res.success) {
                                                            alert('Exame solicitado com sucesso!')
                                                            getVetExams(selectedPet!.id).then(setPetExams)
                                                        } else alert(res.message)
                                                    }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <input type="hidden" name="pet_id" value={selectedPet!.id} />
                                                        <div className={styles.formGroup}>
                                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tipo de Exame *</label>
                                                            <select name="exam_type_id" className={styles.select} required>
                                                                <option value="">Selecione um exame do catálogo...</option>
                                                                {examTypes.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name} (R$ {t.base_price.toFixed(2)})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className={styles.formGroup}>
                                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Data da Solicitação</label>
                                                            <input type="date" name="exam_date" className={styles.input} defaultValue={new Date().toISOString().split('T')[0]} />
                                                        </div>
                                                        <button type="submit" className={styles.addButton} style={{ width: '100%', marginTop: '0.5rem' }}>
                                                            ✓ Solicitar Exame
                                                        </button>
                                                    </form>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {petExams.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>Nenhum exame solicitado ou realizado.</p> : petExams.map(exam => (
                                                    <div key={exam.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{exam.exam_type_name}</strong>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                    Solicitado em: {new Date(exam.exam_date).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                            <ExamPaymentControls 
                                                                examId={exam.id}
                                                                price={exam.price}
                                                                discountPercent={exam.discount_percent}
                                                                discountType={exam.discount_type}
                                                                discountFixed={exam.discount_fixed}
                                                                paymentStatus={exam.payment_status}
                                                                paymentMethod={exam.payment_method}
                                                                onUpdate={() => getVetExams(selectedPet!.id).then(setPetExams)}
                                                            />
                                                        </div>

                                                        {/* RESULTADO / UPLOAD */}
                                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                                            {exam.file_url ? (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <a 
                                                                        href={exam.file_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className={styles.actionBtn}
                                                                        style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                                                    >
                                                                        📄 Ver Resultado (PDF/Imagem)
                                                                    </a>
                                                                    {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'owner' || currentVet) && (
                                                                        <button 
                                                                            className={styles.deleteBtn} 
                                                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                                            onClick={async () => {
                                                                                if (confirm('Deseja remover o arquivo do resultado?')) {
                                                                                    const supabase = createClient()
                                                                                    await supabase.from('vet_exams').update({ file_url: null }).eq('id', exam.id)
                                                                                    getVetExams(selectedPet!.id).then(setPetExams)
                                                                                 }
                                                                            }}
                                                                        >Excluir</button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                (userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'owner' || currentVet) && (
                                                                    <FileUpload 
                                                                        bucket="vet-exams" 
                                                                        label="Upload de Resultado (PDF ou Imagem)"
                                                                        onUpload={async (url) => {
                                                                            const supabase = createClient()
                                                                            await supabase.from('vet_exams').update({ file_url: url }).eq('id', exam.id)
                                                                            getVetExams(selectedPet!.id).then(setPetExams)
                                                                        }}
                                                                        onRemove={() => {}}
                                                                    />
                                                                )
                                                            )}
                                                        </div>

                                                        {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'owner' || currentVet) && (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                                                <button 
                                                                    className={styles.deleteBtn} 
                                                                    style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                                                                    onClick={async () => {
                                                                        if (confirm('Excluir solicitação de exame?')) {
                                                                            await deleteVetExam(exam.id)
                                                                            getVetExams(selectedPet!.id).then(setPetExams)
                                                                        }
                                                                    }}
                                                                >Remover Solicitação</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* HOSPITAL (INTERNAMENTO) */}
                            {planFeatures.includes('clinica_vet') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('hospital' as any)} className={styles.accordionHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Activity size={18} color="var(--primary)" />
                                            <span>Histórico de Internamento</span>
                                        </div>
                                        <span>{(accordions as any).hospital ? '−' : '+'}</span>
                                    </button>
                                    {(accordions as any).hospital && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {hospitalHistory.length === 0 ? <p>Nenhuma internação registrada no histórico.</p> : hospitalHistory.map((adm: any) => (
                                                    <div key={adm.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong>Entrada: {new Date(adm.admitted_at).toLocaleDateString()}</strong>
                                                                <br />
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Leito: {adm.hospital_beds?.name} - {adm.hospital_beds?.hospital_wards?.name}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: adm.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: adm.status === 'active' ? '#10B981' : '#94a3b8' }}>
                                                                    {adm.status === 'active' ? 'INTERNADO' : 'ALTA ' + (adm.discharged_at ? new Date(adm.discharged_at).toLocaleDateString() : '')}
                                                                </span>
                                                                <button className={styles.actionBtn} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={async () => {
                                                                    const meds = await getAllAdmissionMedications(adm.id);
                                                                    setAdmissionMeds(meds);
                                                                    setActiveAdmission(adm);
                                                                    setShowHospitalModal(true);
                                                                }}>Prontuário</button>
                                                            </div>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0', marginTop: '10px' }}><strong>Motivo:</strong> {adm.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AVALIAÇÃO */}
                            {(planFeatures.includes('creche') || planFeatures.includes('hospedagem')) && (
                                <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('assessment')} className={styles.accordionHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <ClipboardCheck size={18} color="var(--primary)" />
                                        <span>Avaliação Comportamental</span>
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
                            )}

                            {/* BANHO E TOSA */}
                            {planFeatures.includes('banho_tosa') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('grooming' as any)} className={styles.accordionHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Scissors size={18} color="var(--primary)" />
                                            <span>Histórico de Banho e Tosa</span>
                                        </div>
                                        <span>{(accordions as any).grooming ? '−' : '+'}</span>
                                    </button>
                                    {(accordions as any).grooming && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {groomingHistory.length === 0 ? <p>Nenhum serviço de banho e tosa registrado.</p> : groomingHistory.map((appt: any) => (
                                                    <div key={appt.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong>{new Date(appt.scheduled_at).toLocaleDateString()}</strong>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: appt.status === 'done' ? '#10B981' : '#f59e0b' }}>
                                                                {appt.status === 'done' ? 'CONCLUÍDO' : appt.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{appt.services?.name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PACOTES */}
                            {planFeatures.includes('pacotes') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('packages')} className={styles.accordionHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Package size={18} color="var(--primary)" />
                                            <span>Pacotes do Pet</span>
                                        </div>
                                        <span>{accordions.packages ? '−' : '+'}</span>
                                    </button>
                                    {accordions.packages && (
                                        <div className={styles.accordionContent}>
                                            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                                <h4>Ativar Novo Pacote</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                    <select className={styles.select} value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
                                                        <option value="">Selecione um pacote...</option>
                                                        {availablePackages.map((p: any) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} - R$ {p.total_price.toFixed(2)}{p.validity_type === 'weekly' ? ` (${p.validity_weeks === 4 ? 'Mensal' : p.validity_weeks === 1 ? 'Semanal' : p.validity_weeks + ' sem'})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {selectedPackageId && (() => {
                                                        const selectedPkg = availablePackages.find((p: any) => p.id === selectedPackageId)
                                                        if (selectedPkg?.validity_type === 'weekly') {
                                                            return (
                                                                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                        🗓️ <strong>Agendamento Automático</strong> — Configure o dia e horário para este pacote ser inserido na agenda automaticamente. Deixe em branco para agendar manualmente.
                                                                    </p>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Dia da Semana</label>
                                                                            <select
                                                                                className={styles.select}
                                                                                value={(selectedPet as any)?._pkgDay ?? ''}
                                                                                onChange={e => {
                                                                                    const val = e.target.value
                                                                                    setSelectedPet((prev: any) => prev ? { ...prev, _pkgDay: val } : prev)
                                                                                }}
                                                                                style={{ fontSize: '0.85rem' }}
                                                                            >
                                                                                <option value="">Sem preferência</option>
                                                                                <option value="0">Domingo</option>
                                                                                <option value="1">Segunda</option>
                                                                                <option value="2">Terça</option>
                                                                                <option value="3">Quarta</option>
                                                                                <option value="4">Quinta</option>
                                                                                <option value="5">Sexta</option>
                                                                                <option value="6">Sábado</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Horário</label>
                                                                            <input
                                                                                type="time"
                                                                                className={styles.input}
                                                                                value={(selectedPet as any)?._pkgTime ?? ''}
                                                                                onChange={e => {
                                                                                    const val = e.target.value
                                                                                    setSelectedPet((prev: any) => prev ? { ...prev, _pkgTime: val } : prev)
                                                                                }}
                                                                                style={{ fontSize: '0.85rem' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    })()}
                                                    <button
                                                        className={styles.addButton}
                                                        disabled={!selectedPackageId || isSelling}
                                                        onClick={async () => {
                                                            if (!selectedPet || !selectedPackageId) return
                                                            setIsSelling(true)
                                                            const pkg = availablePackages.find((p: any) => p.id === selectedPackageId)
                                                            const dayVal = (selectedPet as any)._pkgDay
                                                            const timeVal = (selectedPet as any)._pkgTime
                                                            const preferredDay = dayVal !== undefined && dayVal !== '' ? parseInt(dayVal) : null
                                                            const preferredTime = timeVal || null
                                                            const res = await sellPackageToPet(selectedPet.id, selectedPackageId, pkg.total_price, 'pix', preferredDay, preferredTime)
                                                            if (res.success) {
                                                                alert(res.message)
                                                                getPetPackagesWithUsage(selectedPet.id).then(setPetPackages)
                                                                setSelectedPackageId('')
                                                                setSelectedPet((prev: any) => prev ? { ...prev, _pkgDay: '', _pkgTime: '' } : prev)
                                                            } else alert(res.message)
                                                            setIsSelling(false)
                                                        }}
                                                    >
                                                        {isSelling ? '...' : '✓ Ativar Pacote'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {petPackages.length === 0 ? <p>Nenhum pacote ativo.</p> : petPackages.map((pkg: any, idx: number) => (
                                                    <div key={idx} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>📦 {pkg.package_name}</div>
                                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{pkg.service_name}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ color: pkg.remaining_qty > 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}>
                                                                    {pkg.remaining_qty} / {pkg.total_qty}
                                                                </div>
                                                                <button 
                                                                    className={styles.deleteBtn} 
                                                                    style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', opacity: 0.6 }}
                                                                    onClick={async () => {
                                                                        if (confirm('Deseja realmente CANCELAR este pacote? Os créditos restantes serão desativados.')) {
                                                                            const res = await cancelCustomerPackage(pkg.customer_package_id)
                                                                            if (res.success) {
                                                                                alert(res.message)
                                                                                getPetPackagesWithUsage(selectedPet!.id).then(setPetPackages)
                                                                            } else alert(res.message)
                                                                        }
                                                                    }}
                                                                >
                                                                    Cancelar Pacote
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {pkg.validity_type === 'weekly' && (
                                                            <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>{pkg.validity_weeks === 4 ? '📅 Renovação Mensal' : pkg.validity_weeks === 1 ? '📆 Renovação Semanal' : `📆 Renovação a cada ${pkg.validity_weeks} semanas`}</span>
                                                                {pkg.preferred_day_of_week !== null && pkg.preferred_day_of_week !== undefined && (
                                                                    <span style={{ fontWeight: 700 }}>• {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][pkg.preferred_day_of_week]} {pkg.preferred_time}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            {pkg.period_start && pkg.period_end && (
                                                                <span>Válido até: {new Date(pkg.period_end + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                            )}
                                                        </div>

                                                        {/* Sessões do período */}
                                                        {pkg.sessions && pkg.sessions.length > 0 && (
                                                            <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                    Agenda do Período
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    {pkg.sessions.map((s: any) => (
                                                                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <span style={{ fontWeight: 600 }}>
                                                                                    {s.scheduled_at 
                                                                                        ? new Date(s.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                                                        : '⏳ Data não definida'}
                                                                                </span>
                                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.services?.name}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: s.status === 'done' ? 'rgba(16,185,129,0.2)' : s.status === 'missed' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: s.status === 'done' ? '#10b981' : s.status === 'missed' ? '#ef4444' : '#f59e0b' }}>
                                                                                    {s.status === 'done' ? 'REALIZADO' : s.status === 'missed' ? 'FALTOU' : 'PENDENTE'}
                                                                                </span>
                                                                                {s.status !== 'done' && (
                                                                                    <button 
                                                                                        className={styles.actionBtn}
                                                                                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                                                        onClick={async () => {
                                                                                            const dateStr = prompt('Digite a nova data e hora (Ex: 25/03/2026 14:00)', s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('pt-BR').slice(0, 16) : '')
                                                                                            if (!dateStr) return
                                                                                            
                                                                                            // Parse pt-BR date
                                                                                            const [d, m, y, h, min] = dateStr.match(/\d+/g) || []
                                                                                            if (!d || !m || !y || !h || !min) return alert('Formato inválido. Use DD/MM/AAAA HH:MM')
                                                                                            
                                                                                            const isoDate = `${y}-${m}-${d}T${h}:${min}:00`
                                                                                            const res = await reschedulePackageSession(s.id, isoDate, true, selectedPet!.id, pkg.org_id, s.service_id)
                                                                                            if (res.success) {
                                                                                                alert(res.message)
                                                                                                getPetPackagesWithUsage(selectedPet!.id).then(setPetPackages)
                                                                                            } else alert(res.message)
                                                                                        }}
                                                                                    >
                                                                                        Reagendar
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Dog size={18} color="var(--primary)" />
                                            <span>Histórico de Creche</span>
                                        </div>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Building2 size={18} color="var(--primary)" />
                                            <span>Histórico de Hospedagem</span>
                                        </div>
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
                            {(planFeatures.includes('clinica_vet') || planFeatures.includes('banho_tosa')) && (
                                <div className={styles.accordionItem}>
                                <button type="button" onClick={() => toggleAccordion('vetAlerts' as any)} className={styles.accordionHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <ShieldAlert size={18} color="var(--primary)" />
                                        <span>Alertas Veterinários</span>
                                    </div>
                                    <span>{accordions.vetAlerts ? '−' : '+'}</span>
                                </button>
                                {accordions.vetAlerts && (
                                    <div className={styles.accordionContent}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {vetAlertsForPet.length === 0 ? <p>Nenhum alerta registrado.</p> : vetAlertsForPet.map((alert: any) => (
                                                <div key={alert.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', borderLeft: `6px solid ${alert.status === 'pending' ? '#EF4444' : '#10B981'}` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: 800, color: alert.status === 'pending' ? '#EF4444' : '#10B981', fontSize: '0.9rem' }}>
                                                            {alert.status === 'pending' ? '⚠️ AGUARDANDO VETERINÁRIO' : alert.status === 'scheduled' ? '📅 EM ATENDIMENTO' : '✅ LIDO'}
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
                            )}

                            {/* PETSHOP */}
                            {planFeatures.includes('petshop') && (
                                <div className={styles.accordionItem}>
                                    <button type="button" onClick={() => toggleAccordion('petshop')} className={styles.accordionHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <History size={18} color="var(--primary)" />
                                            <span>Histórico de Compras (Petshop)</span>
                                        </div>
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


            {showHospitalModal && activeAdmission && (
                <InternmentRecordModal
                    admission={activeAdmission}
                    onClose={() => setShowHospitalModal(false)}
                    onSuccess={() => {
                        if (selectedPet) getPetAdmissionsHistory(selectedPet.id).then(setHospitalHistory)
                    }}
                />
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
