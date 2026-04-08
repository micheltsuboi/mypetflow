'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import FinanceiroPaymentModal from '@/components/FinanceiroPaymentModal'
import { X, Trash2 } from 'lucide-react'

type ServiceArea = 'all' | 'banho_tosa' | 'creche' | 'hotel'

interface FinancialMetrics {
    revenue: number
    expenses: number
    profit: number
    pendingPayments: number
    monthlyGrowth: number
}

interface PetToday {
    id: string
    name: string
    breed: string
    area: ServiceArea
    service: string
    status: 'waiting' | 'in_progress' | 'done'
    checkedInAt: string | null
    ownerName: string
}

const areaLabels: Record<ServiceArea, string> = {
    all: 'Todas as Áreas',
    banho_tosa: '🛁 Banho + Tosa',
    creche: '🐕 Creche',
    hotel: '🏨 Hotel'
}

const areaIcons: Record<ServiceArea, string> = {
    all: '📊',
    banho_tosa: '🛁',
    creche: '🐕',
    hotel: '🏨'
}

const statusLabels: Record<string, string> = {
    waiting: 'Aguardando',
    in_progress: 'Em Atendimento',
    done: 'Finalizado'
}

export default function OwnerDashboard() {
    const supabase = createClient()
    const [selectedArea, setSelectedArea] = useState<ServiceArea>('all')
    const [financials, setFinancials] = useState<FinancialMetrics>({
        revenue: 0,
        expenses: 0,
        profit: 0,
        pendingPayments: 0,
        monthlyGrowth: 0
    })
    const router = useRouter()
    const pathname = usePathname()
    const [petsToday, setPetsToday] = useState<PetToday[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        tutors: 0,
        pets: 0,
        appointmentsToday: 0
    })

    // Records for drill-down
    const [extractRecords, setExtractRecords] = useState<{
        type: 'revenue' | 'expenses' | 'pending' | null;
        appointments: any[];
        transactions: any[];
        sales: any[];
        vets: any[];
        exams: any[];
        admissions: any[];
        packages: any[];
    }>({
        type: null,
        appointments: [],
        transactions: [],
        sales: [],
        vets: [],
        exams: [],
        admissions: [],
        packages: []
    })

    const [isExtractModalOpen, setIsExtractModalOpen] = useState(false)
    const [paymentModal, setPaymentModal] = useState<{
        isOpen: boolean,
        recordId: string,
        tableName: 'appointments' | 'orders' | 'vet_consultations' | 'vet_exams' | 'hospital_admissions' | 'customer_packages',
        title: string,
        baseAmount: number
    } | null>(null)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Get user's organization
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('org_id, role')
                    .eq('id', user.id)
                    .single()

                const profile = profileData as { org_id: string; role: string } | null

                if (!profile?.org_id) return

                // Basic Authorization Check
                if (profile.role !== 'admin' && profile.role !== 'staff' && profile.role !== 'superadmin') {
                    router.push('/')
                    return
                }

                // 1. Fetch Financial Data from APPOINTMENTS
                const now = new Date()
                const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
                const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

                // Promise 1: Current month appointments (paid and unpaid)
                const currentMonthApptsPromise = supabase
                    .from('appointments')
                    .select('id, final_price, calculated_price, payment_status, scheduled_at, paid_at, pets ( name ), services ( name, service_categories ( name ) )')
                    .eq('org_id', profile.org_id)
                    .gte('scheduled_at', startOfCurrentMonth)

                // Promise 2: Previous month paid appointments (for growth)
                const prevMonthApptsPromise = supabase
                    .from('appointments')
                    .select('final_price, calculated_price, payment_status')
                    .eq('org_id', profile.org_id)
                    .gte('scheduled_at', startOfPreviousMonth)
                    .lte('scheduled_at', endOfPreviousMonth)

                // Promise 3: Fetch all financial transactions (income and expenses) for the month
                const transactionsPromise = supabase
                    .from('financial_transactions')
                    .select('*')
                    .eq('org_id', profile.org_id)
                    .gte('date', startOfCurrentMonth)

                // Promise 4: Fetch Operational Stats (Tutors Count)
                const tutorsCountPromise = supabase
                    .from('customers')
                    .select('*', { count: 'exact', head: true })
                    .eq('org_id', profile.org_id)

                // Promise 5: Fetch Pets Count
                const petsCountPromise = supabase
                    .from('pets')
                    .select('id, customers!inner(org_id)', { count: 'exact', head: true })
                    .eq('customers.org_id', profile.org_id)

                // Promise 6: Today's appointments for petsToday list and count
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
                const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

                const apptsPromise = supabase
                    .from('appointments')
                    .select('id, scheduled_at, status, check_in_date, check_out_date, pets ( id, name, breed, species, customers ( name ) ), services ( name, service_categories ( name ) )')
                    .eq('org_id', profile.org_id)
                    .or(`and(scheduled_at.gte.${todayStart},scheduled_at.lte.${todayEnd}),and(check_in_date.lte.${todayStart.split('T')[0]},check_out_date.gte.${todayStart.split('T')[0]})`)
                    .neq('status', 'cancelled')
                    .order('scheduled_at', { ascending: true })

                // Extra pending types for accurate "A Receber"
                const pendingSalesPromise = supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')

                const pendingVetsPromise = supabase
                    .from('vet_consultations')
                    .select('*')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')

                const pendingExamsPromise = supabase
                    .from('vet_exams')
                    .select('*')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')

                const pendingAdmissionsPromise = supabase
                    .from('hospital_admissions')
                    .select('total_amount')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')

                // NEW: All pending appointments regardless of date
                const allPendingApptsPromise = supabase
                    .from('appointments')
                    .select('id, final_price, calculated_price, payment_status, scheduled_at, pets ( name ), services ( name )')
                    .eq('org_id', profile.org_id)
                    .or('payment_status.neq.paid,payment_status.is.null')

                const pendingPackagesPromise = supabase
                    .from('customer_packages')
                    .select('id, total_price, total_paid, payment_status, created_at, pets ( name ), package_id ( name )')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')

                const paidPackagesThisMonthPromise = supabase
                    .from('customer_packages')
                    .select('total_price, total_paid, payment_status, created_at')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'paid')
                    .gte('created_at', startOfCurrentMonth)

                // Execute all promises in parallel
                const [
                    currentMonthApptsRes,
                    prevMonthApptsRes,
                    transactionsRes,
                    tutorsCountRes,
                    petsCountRes,
                    apptsRes,
                    pendingSalesRes,
                    pendingVetsRes,
                    pendingExamsRes,
                    pendingAdmissionsRes,
                    allPendingApptsRes,
                    pendingPackagesRes,
                    paidPackagesThisMonthRes
                ] = await Promise.all([
                    currentMonthApptsPromise,
                    prevMonthApptsPromise,
                    transactionsPromise,
                    tutorsCountPromise,
                    petsCountPromise,
                    apptsPromise,
                    pendingSalesPromise,
                    pendingVetsPromise,
                    pendingExamsPromise,
                    pendingAdmissionsPromise,
                    allPendingApptsPromise,
                    pendingPackagesPromise,
                    paidPackagesThisMonthPromise
                ])

                const currentMonthAppts = currentMonthApptsRes.data || []
                const prevMonthAppts = prevMonthApptsRes.data || []
                const transactions = transactionsRes.data || []
                const tutorsCount = tutorsCountRes.count || 0
                const petsCount = petsCountRes.count || 0
                const appts = apptsRes.data || []
                const apptError = apptsRes.error
                const pendingSales = pendingSalesRes.data || []
                const pendingVets = pendingVetsRes.data || []
                const pendingExams = pendingExamsRes.data || []
                const pendingAdmissions = pendingAdmissionsRes.data || []
                const allPendingAppts = allPendingApptsRes.data || []
                const pendingPackages = pendingPackagesRes.data || []
                const paidPackagesThisMonth = paidPackagesThisMonthRes.data || []

                if (apptError) {
                    console.error("Error fetching owner appointments:", apptError)
                }

                // Process financial data after all promises resolved
                const incomeTxs = (transactions || []).filter((t: any) => t.type === 'income')
                const expenseTxs = (transactions || []).filter((t: any) => t.type === 'expense')
                const referencedIds = new Set(incomeTxs.map((t: any) => t.reference_id).filter(id => !!id))

                const paidAppts = currentMonthAppts.filter((a: any) => 
                    a.payment_status === 'paid' && 
                    !referencedIds.has(a.id) &&
                    (a.final_price || a.calculated_price || 0) > 0
                )
                
                const currentRevenue = paidAppts
                    .reduce((sum: number, a: Record<string, any>) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)
                    + (paidPackagesThisMonth || [])
                    .filter((p: any) => !referencedIds.has(p.id))
                    .reduce((sum: number, p: any) => sum + (p.total_paid || p.total_price || 0), 0)

                // Sum ALL pending items for accurate "A Receber"
                const pendingPayments = allPendingAppts.reduce((sum: number, a: any) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)
                    + (pendingSales || []).reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)
                    + (pendingVets || []).reduce((sum: number, v: any) => {
                        let val = v.consultation_fee || 0;
                        if (v.discount_type === 'percent') val -= val * ((v.discount_percent || 0) / 100);
                        else val -= (v.discount_fixed || 0);
                        return sum + Math.max(0, val);
                    }, 0)
                    + (pendingExams || []).reduce((sum: number, e: any) => {
                        let val = e.price || 0;
                        if (e.discount_type === 'percent') val -= val * ((e.discount_percent || 0) / 100);
                        else val -= (e.discount_fixed || 0);
                        return sum + Math.max(0, val);
                    }, 0)
                    + (pendingAdmissions || []).reduce((sum: number, ad: any) => sum + (ad.total_amount || 0), 0)
                    + (pendingPackages || []).reduce((sum: number, p: any) => sum + (Math.max(0, Number(p.total_price || 0) - Number(p.total_paid || 0))), 0)

                const prevRevenue = prevMonthAppts
                    .filter((a: any) => a.payment_status === 'paid')
                    .reduce((sum: number, a: Record<string, any>) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)

                const productRevenue = incomeTxs.reduce((sum: number, t: Record<string, any>) => sum + t.amount, 0)
                const expenses = expenseTxs.reduce((sum: number, t: Record<string, any>) => sum + t.amount, 0)

                const totalRevenue = currentRevenue + productRevenue
                const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

                setFinancials({
                    revenue: totalRevenue,
                    expenses,
                    profit: totalRevenue - expenses,
                    pendingPayments,
                    monthlyGrowth: parseFloat(growth.toFixed(1))
                })

                // Store records for extract
                setExtractRecords({
                    type: null,
                    appointments: currentMonthAppts,
                    transactions: transactions || [],
                    sales: pendingSales || [],
                    vets: pendingVets || [],
                    exams: pendingExams || [],
                    admissions: pendingAdmissions || [],
                    packages: (pendingPackages || []).filter((p: any) => (Number(p.total_price || 0) - Number(p.total_paid || 0)) > 0)
                })

                let mappedPets: PetToday[] = []
                if (appts) {
                    mappedPets = appts.map((a: any) => {
                        const catName = (a.services as any)?.service_categories?.name || ''
                        let area: ServiceArea = 'all'
                        if (catName.includes('Banho') || catName.includes('Tosa')) area = 'banho_tosa'
                        else if (catName.includes('Creche')) area = 'creche'
                        else if (catName.includes('Hospedagem') || catName.includes('Hotel')) area = 'hotel'

                        return {
                            id: a.id,
                            name: (a.pets as any)?.name || 'Desconhecido',
                            breed: (a.pets as any)?.breed || '',
                            area,
                            service: (a.services as any)?.name || '',
                            status: a.status === 'done' ? 'done' : a.status === 'in_progress' ? 'in_progress' : 'waiting',
                            checkedInAt: new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                            ownerName: (a.pets as any)?.customers?.name || 'Cliente'
                        }
                    })
                    setPetsToday(mappedPets)
                }

                setStats({
                    tutors: tutorsCount || 0,
                    pets: petsCount || 0,
                    appointmentsToday: mappedPets.length
                })

            } catch (error) {
                console.error('Erro ao carregar dashboard:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const handleOpenExtract = async (type: 'revenue' | 'expenses' | 'pending') => {
        let appointments = extractRecords.appointments
        
        if (type === 'pending') {
            const { data: allPending } = await supabase
                .from('appointments')
                .select('id, final_price, calculated_price, payment_status, scheduled_at, pets ( name ), services ( name )')
                .or('payment_status.neq.paid,payment_status.is.null')
            if (allPending) appointments = allPending
        } else if (type === 'revenue') {
            // Already fetched in currentMonthAppts mostly, but for simplicity let's stick to current logic
        }

        setExtractRecords(prev => ({ ...prev, type, appointments }))
        setIsExtractModalOpen(true)
    }

    const handleDeleteTransaction = async (txId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', txId)

            if (error) throw error

            alert('Transação excluída com sucesso!')
            window.location.reload()
        } catch (error) {
            console.error('Erro ao excluir transação:', error)
            alert('Erro ao excluir transação.')
        }
    }

    const filteredPets = selectedArea === 'all'
        ? petsToday
        : petsToday.filter(p => p.area === selectedArea)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const getAreaStats = () => {
        const todayCount = selectedArea === 'all'
            ? petsToday.length
            : petsToday.filter(p => p.area === selectedArea).length

        // Deduplication for area stats too
        const incomeTxs = financials.revenue > 0 ? extractRecords.transactions.filter((t: any) => t.type === 'income') : []
        const referencedIds = new Set(incomeTxs.map((t: any) => t.reference_id).filter(id => !!id))

        const monthAppts = extractRecords.appointments.filter(a => {
            const catName = (a.services as any)?.service_categories?.name || ''
            let matchesArea = false
            if (selectedArea === 'all') matchesArea = true
            else if (selectedArea === 'banho_tosa') matchesArea = catName.includes('Banho') || catName.includes('Tosa')
            else if (selectedArea === 'creche') matchesArea = catName.includes('Creche')
            else if (selectedArea === 'hotel') matchesArea = catName.includes('Hospedagem') || catName.includes('Hotel')
            
            return matchesArea
        })

        const monthCount = monthAppts.length
        
        // Sum transactions that match the area
        const txRevenue = incomeTxs.filter(t => {
            if (selectedArea === 'all') return true
            const cat = (t.category || '').toLowerCase()
            return cat.includes(selectedArea.replace('_', ' '))
        }).reduce((sum, t) => sum + t.amount, 0)

        // Sum appointments that are NOT in transactions and match area
        const apptRevenue = monthAppts
            .filter(a => a.payment_status === 'paid' && !referencedIds.has(a.id) && (a.final_price || a.calculated_price || 0) > 0)
            .reduce((sum, a) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)

        return { todayCount, monthCount, revenue: txRevenue + apptRevenue }
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando dashboard...</p>
            </div>
        )
    }

    const currentStats = getAreaStats()

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>👋 Olá, Proprietário</h1>
                    <p className={styles.subtitle}>Painel de Gestão do Pet Shop</p>
                </div>
            </div>

            {/* Operational Stats */}
            <div className={styles.financialGrid}>
                <div className={styles.financialCard}>
                    <div className={styles.cardIcon}>👤</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats.tutors}</span>
                        <span className={styles.cardLabel}>Total de Tutores</span>
                    </div>
                </div>
                <div className={styles.financialCard}>
                    <div className={styles.cardIcon}>🐾</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats.pets}</span>
                        <span className={styles.cardLabel}>Pets Cadastrados</span>
                    </div>
                </div>
                <div className={styles.financialCard}>
                    <div className={styles.cardIcon}>📅</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{stats.appointmentsToday}</span>
                        <span className={styles.cardLabel}>Agendamentos Hoje</span>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <h2 className={styles.sectionTitle}>💰 Resumo Financeiro</h2>
            <div className={styles.financialGrid}>
                <div
                    className={`${styles.financialCard} ${styles.clickable}`}
                    onClick={() => handleOpenExtract('revenue')}
                >
                    <div className={styles.cardIcon}>💰</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{formatCurrency(financials.revenue)}</span>
                        <span className={styles.cardLabel}>Faturamento do Mês</span>
                    </div>
                    <span className={`${styles.growth} ${financials.monthlyGrowth >= 0 ? styles.positive : styles.negative}`}>
                        {financials.monthlyGrowth >= 0 ? '+' : ''}{financials.monthlyGrowth}%
                    </span>
                </div>
                <div
                    className={`${styles.financialCard} ${styles.clickable}`}
                    onClick={() => handleOpenExtract('expenses')}
                >
                    <div className={styles.cardIcon}>📉</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue}>{formatCurrency(financials.expenses)}</span>
                        <span className={styles.cardLabel}>Despesas</span>
                    </div>
                </div>
                <div
                    className={`${styles.financialCard} ${styles.clickable}`}
                    onClick={() => handleOpenExtract('revenue')} // Show revenue for profit too
                >
                    <div className={styles.cardIcon}>📈</div>
                    <div className={styles.cardContent}>
                        <span 
                            className={styles.cardValue} 
                            style={{ color: financials.profit >= 0 ? '#10b981' : '#ef4444' }}
                        >
                            {formatCurrency(financials.profit)}
                        </span>
                        <span className={styles.cardLabel}>Lucro Líquido</span>
                    </div>
                </div>
                <div
                    className={`${styles.financialCard} ${styles.clickable}`}
                    onClick={() => handleOpenExtract('pending')}
                >
                    <div className={styles.cardIcon}>⏳</div>
                    <div className={styles.cardContent}>
                        <span className={styles.cardValue} style={{ color: '#f59e0b' }}>{formatCurrency(financials.pendingPayments)}</span>
                        <span className={styles.cardLabel}>A Receber</span>
                    </div>
                </div>
            </div>

            {/* Area Filter Tabs */}
            <div className={styles.areaTabs}>
                {(['all', 'banho_tosa', 'creche', 'hotel'] as ServiceArea[]).map(area => (
                    <button
                        key={area}
                        className={`${styles.areaTab} ${selectedArea === area ? styles.active : ''}`}
                        onClick={() => setSelectedArea(area)}
                    >
                        <span>{areaIcons[area]}</span>
                        <span>{area === 'all' ? 'Todas' : areaLabels[area].split(' ').slice(1).join(' ')}</span>
                        <span className={styles.tabCount}>
                            {area === 'all'
                                ? petsToday.length
                                : petsToday.filter(p => p.area === area).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Area Stats */}
            <div className={styles.areaStats}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{currentStats.todayCount}</span>
                    <span className={styles.statLabel}>Hoje</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{currentStats.monthCount}</span>
                    <span className={styles.statLabel}>Este Mês</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{formatCurrency(currentStats.revenue)}</span>
                    <span className={styles.statLabel}>Receita</span>
                </div>
            </div>

            {/* Pets List */}
            <div className={styles.petsSection}>
                <h2 className={styles.sectionTitle}>
                    {areaLabels[selectedArea]} - Pets de Hoje
                </h2>

                <div className={styles.petsList}>
                    {filteredPets.map(pet => (
                        <div key={pet.id} className={styles.petCard}>
                            <div className={styles.petAvatar}>
                                <span>{areaIcons[pet.area]}</span>
                            </div>
                            <div className={pet.status === 'done' ? styles.petInfoDone : styles.petInfo}>
                                <div className={styles.petHeader}>
                                    <span className={styles.petName}>{pet.name}</span>
                                    <span className={`${styles.statusBadge} ${styles[pet.status]}`}>
                                        {statusLabels[pet.status]}
                                    </span>
                                </div>
                                <span className={styles.petBreed}>{pet.breed}</span>
                                <span className={styles.petService}>{pet.service}</span>
                            </div>
                            <div className={styles.petMeta}>
                                <span className={styles.ownerName}>{pet.ownerName}</span>
                                {pet.checkedInAt && (
                                    <span className={styles.checkInTime}>Check-in: {pet.checkedInAt}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredPets.length === 0 && (
                    <div className={styles.emptyState}>
                        <span>🐾</span>
                        <p>Nenhum pet nesta área hoje (Agendamentos em breve)</p>
                    </div>
                )}
            </div>

            {/* Extract Modal */}
            {isExtractModalOpen && extractRecords.type && (
                <div className={styles.modalOverlay} onClick={() => setIsExtractModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={() => setIsExtractModalOpen(false)}>
                            <X size={24} />
                        </button>

                        <h2>
                            {extractRecords.type === 'revenue' && '📜 Extrato de Faturamento'}
                            {extractRecords.type === 'expenses' && '📉 Extrato de Despesas'}
                            {extractRecords.type === 'pending' && '⏳ Valores a Receber'}
                        </h2>

                        <div className={styles.extractList}>
                            {/* Pendências unificadas */}
                            {extractRecords.type === 'pending' ? (
                                <>
                                    {/* Agendamentos Pendentes */}
                                    {extractRecords.appointments
                                        .filter(a => a.payment_status !== 'paid' || a.payment_status === null)
                                        .map(appt => (
                                            <div key={appt.id} className={styles.extractItem}>
                                                <div className={styles.extractInfo}>
                                                    <strong>🐾 {appt.pets?.name || 'Pet'} • {appt.services?.name || 'Serviço'}</strong>
                                                    <span>{new Date(appt.scheduled_at).toLocaleDateString('pt-BR')}</span>
                                                    <span className={styles.badgeLabel}>Agendamento</span>
                                                </div>
                                                <div className={styles.extractActions}>
                                                    <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                        {formatCurrency(appt.final_price || appt.calculated_price || 0)}
                                                    </span>
                                                    <button
                                                        className={styles.confirmPayBtn}
                                                        onClick={() => setPaymentModal({
                                                            isOpen: true,
                                                            recordId: appt.id,
                                                            tableName: 'appointments',
                                                            title: `Pagamento: ${appt.pets?.name}`,
                                                            baseAmount: appt.final_price || appt.calculated_price || 0
                                                        })}
                                                    >
                                                        💰 Confirmar Pago
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {/* Vendas Pendentes (PDV) */}
                                    {extractRecords.sales.map(sale => (
                                        <div key={sale.id} className={styles.extractItem}>
                                            <div className={styles.extractInfo}>
                                                <strong>🛒 Venda #{sale.id.slice(0, 8)}</strong>
                                                <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                                                <span className={styles.badgeLabel}>Petshop / PDV</span>
                                            </div>
                                            <div className={styles.extractActions}>
                                                <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                    {formatCurrency(sale.total_amount)}
                                                </span>
                                                <button
                                                    className={styles.confirmPayBtn}
                                                    onClick={() => setPaymentModal({
                                                        isOpen: true,
                                                        recordId: sale.id,
                                                        tableName: 'orders',
                                                        title: `Venda: #${sale.id.slice(0, 8)}`,
                                                        baseAmount: sale.total_amount
                                                    })}
                                                >
                                                    💰 Confirmar Pago
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Consultas Pendentes */}
                                    {extractRecords.vets.map(vet => {
                                        let val = vet.consultation_fee || 0;
                                        if (vet.discount_type === 'percent') val -= val * ((vet.discount_percent || 0) / 100);
                                        else val -= (vet.discount_fixed || 0);
                                        const finalVal = Math.max(0, val);
                                        return (
                                            <div key={vet.id} className={styles.extractItem}>
                                                <div className={styles.extractInfo}>
                                                    <strong>🩺 Consulta Veterinária</strong>
                                                    <span>{new Date(vet.created_at).toLocaleDateString('pt-BR')}</span>
                                                    <span className={styles.badgeLabel}>Veterinário</span>
                                                </div>
                                                <div className={styles.extractActions}>
                                                    <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                        {formatCurrency(finalVal)}
                                                    </span>
                                                    <button
                                                        className={styles.confirmPayBtn}
                                                        onClick={() => setPaymentModal({
                                                            isOpen: true,
                                                            recordId: vet.id,
                                                            tableName: 'vet_consultations',
                                                            title: `Consulta Vet`,
                                                            baseAmount: finalVal
                                                        })}
                                                    >
                                                        💰 Confirmar Pago
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Exames Pendentes */}
                                    {extractRecords.exams.map(exam => {
                                        let val = exam.price || 0;
                                        if (exam.discount_type === 'percent') val -= val * ((exam.discount_percent || 0) / 100);
                                        else val -= (exam.discount_fixed || 0);
                                        const finalVal = Math.max(0, val);
                                        return (
                                            <div key={exam.id} className={styles.extractItem}>
                                                <div className={styles.extractInfo}>
                                                    <strong>🔬 Exame: {exam.name}</strong>
                                                    <span>{new Date(exam.created_at).toLocaleDateString('pt-BR')}</span>
                                                    <span className={styles.badgeLabel}>Exames</span>
                                                </div>
                                                <div className={styles.extractActions}>
                                                    <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                        {formatCurrency(finalVal)}
                                                    </span>
                                                    <button
                                                        className={styles.confirmPayBtn}
                                                        onClick={() => setPaymentModal({
                                                            isOpen: true,
                                                            recordId: exam.id,
                                                            tableName: 'vet_exams',
                                                            title: `Exame: ${exam.name}`,
                                                            baseAmount: finalVal
                                                        })}
                                                    >
                                                        💰 Confirmar Pago
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Internações Pendentes */}
                                    {extractRecords.admissions.map(adm => (
                                        <div key={adm.id} className={styles.extractItem}>
                                            <div className={styles.extractInfo}>
                                                <strong>🏥 Internação Hospitalar</strong>
                                                <span>{new Date(adm.created_at).toLocaleDateString('pt-BR')}</span>
                                                <span className={styles.badgeLabel}>Hospital</span>
                                            </div>
                                            <div className={styles.extractActions}>
                                                <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                    {formatCurrency(adm.total_amount)}
                                                </span>
                                                <button
                                                    className={styles.confirmPayBtn}
                                                    onClick={() => setPaymentModal({
                                                        isOpen: true,
                                                        recordId: adm.id,
                                                        tableName: 'hospital_admissions',
                                                        title: `Internação`,
                                                        baseAmount: adm.total_amount
                                                    })}
                                                >
                                                    💰 Confirmar Pago
                                                </button>
                                            </div>
                                        </div>
                                    ))}
 
                                    {/* Pacotes Pendentes */}
                                    {extractRecords.packages.map(pkg => (
                                        <div key={pkg.id} className={styles.extractItem}>
                                            <div className={styles.extractInfo}>
                                                <strong>📦 Pacote: {pkg.package_id?.name || 'Pacote'} • {pkg.pets?.name || 'Pet'}</strong>
                                                <span>{new Date(pkg.created_at).toLocaleDateString('pt-BR')}</span>
                                                <span className={styles.badgeLabel}>Pacote</span>
                                            </div>
                                            <div className={styles.extractActions}>
                                                <span className={styles.extractAmount} style={{ color: '#f59e0b' }}>
                                                    {formatCurrency(Number(pkg.total_price || 0) - Number(pkg.total_paid || 0))}
                                                </span>
                                                <button
                                                    className={styles.confirmPayBtn}
                                                    onClick={() => setPaymentModal({
                                                        isOpen: true,
                                                        recordId: pkg.id,
                                                        tableName: 'customer_packages',
                                                        title: `Pagamento Pacote: ${pkg.pets?.name}`,
                                                        baseAmount: Number(pkg.total_price || 0) - Number(pkg.total_paid || 0)
                                                    })}
                                                >
                                                    💰 Confirmar Pago
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {/* Appointments list (for Revenue only if not pending) */}
                                    {/* Unify Revenue List in Modal */}
                                    {(() => {
                                        const referencedIds = new Set(
                                            extractRecords.transactions
                                                .filter(t => t.type === 'income' && t.reference_id)
                                                .map(t => t.reference_id)
                                        );

                                        return (
                                            <>
                                                {/* Transactions list (Income) */}
                                                {extractRecords.transactions
                                                    .filter(t => extractRecords.type === 'revenue' && t.type === 'income')
                                                    .map(tx => (
                                                        <div key={tx.id} className={styles.extractItem}>
                                                            <div className={styles.extractInfo}>
                                                                <strong>{tx.category}</strong>
                                                                <span>{tx.description}</span>
                                                                <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div className={styles.extractActions}>
                                                                <span className={styles.extractAmount}>
                                                                    {formatCurrency(tx.amount)}
                                                                </span>
                                                                <button onClick={() => handleDeleteTransaction(tx.id)} className={styles.deleteBtn}>
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                {/* Filtered Appointments (only if not in transactions and value > 0) */}
                                                {extractRecords.appointments
                                                    .filter(a => 
                                                        a.payment_status === 'paid' && 
                                                        !referencedIds.has(a.id) &&
                                                        (a.final_price || a.calculated_price || 0) > 0
                                                    )
                                                    .map(appt => (
                                                        <div key={appt.id} className={styles.extractItem}>
                                                            <div className={styles.extractInfo}>
                                                                <strong>{appt.pets?.name || 'Pet'} • {appt.services?.name || 'Serviço'}</strong>
                                                                <span>{new Date(appt.scheduled_at).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div className={styles.extractActions}>
                                                                <span className={styles.extractAmount}>
                                                                    {formatCurrency(appt.final_price || appt.calculated_price || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}

                                                {/* Expenses List */}
                                                {extractRecords.transactions
                                                    .filter(t => extractRecords.type === 'expenses' && t.type === 'expense')
                                                    .map(tx => (
                                                        <div key={tx.id} className={styles.extractItem}>
                                                            <div className={styles.extractInfo}>
                                                                <strong>{tx.category}</strong>
                                                                <span>{tx.description}</span>
                                                                <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div className={styles.extractActions}>
                                                                <span className={styles.extractAmount}>
                                                                    {formatCurrency(tx.amount)}
                                                                </span>
                                                                <button onClick={() => handleDeleteTransaction(tx.id)} className={styles.deleteBtn}>
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </>
                                        );
                                    })()}
                                </>
                            )}

                            {/* Empty State */}
                            {((extractRecords.type === 'pending' && extractRecords.appointments.filter(a => a.payment_status !== 'paid' || a.payment_status === null).length === 0) ||
                                (extractRecords.type === 'expenses' && extractRecords.transactions.filter(t => t.type === 'expense').length === 0) ||
                                (extractRecords.type === 'revenue' &&
                                    extractRecords.appointments.filter(a => a.payment_status === 'paid').length === 0 &&
                                    extractRecords.transactions.filter(t => t.type === 'income').length === 0)) && (
                                    <p className={styles.emptyExtract}>Nenhum registro encontrado para este período.</p>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {paymentModal?.isOpen && (
                <FinanceiroPaymentModal 
                    recordId={paymentModal.recordId}
                    tableName={paymentModal.tableName}
                    title={paymentModal.title}
                    baseAmount={paymentModal.baseAmount}
                    onClose={() => setPaymentModal(null)}
                    onSuccess={() => {
                        setPaymentModal(null)
                        alert('Pagamento registrado com sucesso!')
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}
