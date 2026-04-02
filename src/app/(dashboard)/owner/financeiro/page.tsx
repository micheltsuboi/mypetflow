'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { FinancialTransaction } from '@/types/database'
import { exportToCsv } from '@/utils/export'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { payPetshopSale } from '@/app/actions/petshop'
import PlanGuard from '@/components/modules/PlanGuard'
import DateInput from '@/components/ui/DateInput'
import EmitirNFModal from '@/components/EmitirNFModal'
import { NotaFiscalTipo, NotaFiscalOrigem } from '@/types/database'
import { Search, Filter, Download, XCircle, FileText, List, Plus, Trash2, Send, FileCode, DollarSign, Wallet, CreditCard, Banknote, Calendar, Repeat, PlusCircle, Tag, ExternalLink, ChevronRight } from 'lucide-react'
import CancelamentoNFModal from '@/components/CancelamentoNFModal'
import FinanceiroPaymentModal from '@/components/FinanceiroPaymentModal'
import {
    getExpenseCategories, createExpenseCategory, createExpense,
    getRecurringExpenses, getRecurringExceptions, cancelRecurringExpenseForMonth, deleteRecurringExpense
} from '@/app/actions/finance'
import { ExpenseCategory, RecurringExpense, RecurringExpenseException } from '@/types/database'

interface MonthlyData {
    month: string
    revenue: number
    expenses: number
    profit: number
}

interface CategoryRevenue {
    name: string
    revenue: number
    count: number
    percentage: number
}

export default function FinanceiroPage() {
    const supabase = createClient()
    const [period, setPeriod] = useState<'month' | 'year'>('month')
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([])
    const [loading, setLoading] = useState(true)
    const [activeRevenueValue, setActiveRevenueValue] = useState(0)
    const [activeExpensesValue, setActiveExpensesValue] = useState(0)
    const [pendingTotalValue, setPendingTotalValue] = useState(0)

    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })

    const [extractRecords, setExtractRecords] = useState<{
        type: 'revenue' | 'expenses' | 'pending' | null;
        appointments: any[];
        transactions: any[];
        pendingSales: any[];
        paidSales: any[];
        pendingVets: any[];
        pendingExams: any[];
        pendingAdmissions: any[];
        allPendingAppointments: any[];
    }>({
        type: null,
        appointments: [],
        transactions: [],
        pendingSales: [],
        paidSales: [],
        pendingVets: [],
        pendingExams: [],
        pendingAdmissions: [],
        allPendingAppointments: []
    })
    const [isExtractModalOpen, setIsExtractModalOpen] = useState(false)
    const [nfMap, setNfMap] = useState<Record<string, { id: string, status: string, pdf_url?: string }>>({})
    const [showNFModal, setShowNFModal] = useState(false)
    const [nfConfig, setNfConfig] = useState<any>(null)

    // NF Dashboard / Filters
    const [modalTab, setModalTab] = useState<'extrato' | 'nfs'>('extrato')
    const [nfSearchTerm, setNfSearchTerm] = useState('')
    const [nfStatusFilter, setNfStatusFilter] = useState('all')
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
    const [selectedNfToCancel, setSelectedNfToCancel] = useState<{ id: string, numero?: string, refId: string } | null>(null)
    const [paymentModal, setPaymentModal] = useState<{
        isOpen: boolean,
        recordId: string,
        tableName: 'appointments' | 'orders' | 'vet_consultations' | 'vet_exams' | 'hospital_admissions',
        title: string,
        baseAmount: number
    } | null>(null)

    // Expense Management
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
    const [recurringExceptions, setRecurringExceptions] = useState<RecurringExpenseException[]>([])
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: 0,
        category_id: '',
        category_name: '',
        date: new Date().toISOString().split('T')[0],
        is_recurring: false
    })

    const fetchFinancials = useCallback(async () => {
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

            // 1. Fetch data for Chart (Last 6 months)
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
            sixMonthsAgo.setDate(1)
            const chartStart = sixMonthsAgo.toISOString()

            // 2. Fetch data for Summary and Categories (Selected Period)
            // We fetch a bit more for the previous month to calculate growth
            const prevMonthDate = new Date(startDate)
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
            const fetchStart = prevMonthDate < sixMonthsAgo ? prevMonthDate.toISOString() : chartStart

            const [
                apptsResponse, txsResponse, pendingSalesResponse, paidSalesResponse,
                pendingVetsResponse, pendingExamsResponse, pendingAdmissionsResponse,
                allPendingApptsResponse,
                catsData,
                recExps,
                recExcs
            ] = await Promise.all([
                supabase
                    .from('appointments')
                    .select(`
                        id, final_price, calculated_price, payment_status, scheduled_at, paid_at,
                        pets ( 
                            name,
                            customers ( id, name, cpf, cpf_cnpj, address, neighborhood, city, email, phone_1 )
                        ),
                        services (
                            name,
                            service_categories ( name )
                        )
                    `)
                    .eq('org_id', profile.org_id)
                    .gte('scheduled_at', fetchStart)
                    .order('scheduled_at', { ascending: true }),
                supabase
                    .from('financial_transactions')
                    .select('*')
                    .eq('org_id', profile.org_id)
                    .gte('date', fetchStart),
                supabase
                    .from('orders')
                    .select('id, total_amount, payment_status, created_at, pets ( name, customers ( id, name, cpf, cpf_cnpj, address, neighborhood, city, email, phone_1 ) ), order_items(product_name)')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending')
                    .order('created_at', { ascending: true }),
                supabase
                    .from('orders')
                    .select('id, total_amount, payment_status, created_at, pets ( name, customers ( id, name, cpf, cpf_cnpj, address, neighborhood, city, email, phone_1 ) ), order_items(product_name)')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'paid')
                    .gte('created_at', fetchStart)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('vet_consultations')
                    .select('*, pets ( name, customers ( name ) )')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending'),
                supabase
                    .from('vet_exams')
                    .select('*, pets ( name, customers ( name ) )')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending'),
                supabase
                    .from('hospital_admissions')
                    .select('*, pets ( name, customers ( name ) )')
                    .eq('org_id', profile.org_id)
                    .eq('payment_status', 'pending'),
                supabase
                    .from('appointments')
                    .select(`
                        id, final_price, calculated_price, payment_status, scheduled_at, paid_at,
                        pets ( name, customers ( id, name, cpf, cpf_cnpj, address, neighborhood, city, email, phone_1 ) ),
                        services ( name, service_categories ( name ) )
                    `)
                    .eq('org_id', profile.org_id)
                    .or('payment_status.neq.paid,payment_status.is.null'),
                getExpenseCategories(),
                getRecurringExpenses() as Promise<RecurringExpense[]>,
                getRecurringExceptions() as Promise<RecurringExpenseException[]>
            ])

            if (apptsResponse.error) throw apptsResponse.error
            if (txsResponse.error) throw txsResponse.error
            if (pendingSalesResponse.error) throw pendingSalesResponse.error
            if (paidSalesResponse.error) throw paidSalesResponse.error

            const appointments = apptsResponse.data || []
            const transactions = txsResponse.data || []
            const pendingSales = pendingSalesResponse.data || []
            const paidSales = paidSalesResponse.data || []
            const pendingVets = pendingVetsResponse.data || []
            const pendingExams = pendingExamsResponse.data || []
            const pendingAdmissions = pendingAdmissionsResponse.data || []
            const allPendingAppts = allPendingApptsResponse?.data || []

            setExpenseCategories(catsData)
            setRecurringExpenses(recExps)
            setRecurringExceptions(recExcs)

            // --- Process Monthly Chart Data (Last 6 Months) ---
            const monthMap = new Map<string, MonthlyData>()
            const chartMonths: { key: string, date: Date, monthYear: string }[] = []

            for (let i = 0; i < 6; i++) {
                const d = new Date(sixMonthsAgo)
                d.setMonth(d.getMonth() + i)
                const monthKey = d.toLocaleString('pt-BR', { month: 'short' })
                const monthYear = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
                monthMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0 })
                chartMonths.push({ key: monthKey, date: new Date(d.getFullYear(), d.getMonth(), 1), monthYear })
            }

            // Add Appointments to Chart
            appointments.forEach((appt: any) => {
                const dateAt = appt.payment_status === 'paid' ? appt.paid_at! : appt.scheduled_at
                const date = new Date(dateAt)
                const monthKey = date.toLocaleString('pt-BR', { month: 'short' })
                if (monthMap.has(monthKey) && appt.payment_status === 'paid') {
                    const data = monthMap.get(monthKey)!
                    data.revenue += (appt.final_price ?? appt.calculated_price ?? 0)
                }
            })

            // Add Transactions to Chart
            transactions.forEach((t: any) => {
                const date = new Date(t.date)
                const monthKey = date.toLocaleString('pt-BR', { month: 'short' })
                const data = monthMap.get(monthKey)
                if (data) {
                    if (t.type === 'income') data.revenue += t.amount
                    else data.expenses += t.amount
                    data.profit = data.revenue - data.expenses
                }
            })

            // Add Recurring Expenses to Chart
            chartMonths.forEach(m => {
                let monthlyRecExpenses = 0
                recExps.forEach(re => {
                    const reStartDate = new Date(re.start_date)
                    if (reStartDate <= new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0)) {
                        const hasException = recExcs.some(ex => ex.recurring_expense_id === re.id && ex.month_year === m.monthYear)
                        if (!hasException) {
                            monthlyRecExpenses += Number(re.amount)
                        }
                    }
                })
                const data = monthMap.get(m.key)
                if (data) {
                    data.expenses += monthlyRecExpenses
                    data.profit = data.revenue - data.expenses
                }
            })
            setMonthlyData(Array.from(monthMap.values()))

            // Fetch NF Status for all revenue items
            const allRevenueIds = [
                ...appointments.filter((a: any) => a.payment_status === 'paid').map((a: any) => a.id),
                ...pendingSales.map((s: any) => s.id),
                ...paidSales.map((s: any) => s.id)
            ]

            if (allRevenueIds.length > 0) {
                const { data: nfs } = await supabase
                    .from('notas_fiscais')
                    .select('id, origem_id, status, caminho_pdf')
                    .in('origem_id', allRevenueIds)

                if (nfs) {
                    const map: any = {}
                    nfs.forEach((nf: any) => {
                        map[nf.origem_id] = {
                            id: nf.id,
                            status: nf.status,
                            pdf_url: nf.caminho_pdf
                        }
                    })
                    setNfMap(map)
                }
            }

            // --- Process Summary and Categories (filtered by startDate/endDate) ---
            const filterByPeriod = (dateStr: string) => {
                const d = new Date(dateStr)
                return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59')
            }

            const activeAppts = appointments.filter((a: any) => filterByPeriod(a.payment_status === 'paid' ? a.paid_at! : a.scheduled_at))
            const activeTxs = transactions.filter((t: any) => filterByPeriod(t.date))
            const activePaidSales = paidSales.filter((s: any) => filterByPeriod(s.created_at))

            const catMap = new Map<string, CategoryRevenue>()
            let totalRev = 0

            // Combine income sources for categories
            activeAppts.forEach((a: any) => {
                if (a.payment_status === 'paid') {
                    const catName = (a.services as any)?.service_categories?.name || 'Serviços'
                    const amount = a.final_price ?? a.calculated_price ?? 0
                    const current = catMap.get(catName) || { name: catName, revenue: 0, count: 0, percentage: 0 }
                    current.revenue += amount
                    current.count += 1
                    catMap.set(catName, current)
                    totalRev += amount
                }
            })

            activeTxs.forEach((t: any) => {
                if (t.type === 'income') {
                    const catName = t.category || 'Outros'
                    const current = catMap.get(catName) || { name: catName, revenue: 0, count: 0, percentage: 0 }
                    current.revenue += t.amount
                    current.count += 1
                    catMap.set(catName, current)
                    totalRev += t.amount
                }
            })

            setCategoryRevenue(
                Array.from(catMap.values())
                    .map((c: any) => ({
                        ...c,
                        percentage: totalRev > 0 ? parseFloat(((c.revenue / totalRev) * 100).toFixed(1)) : 0
                    }))
                    .sort((a: any, b: any) => b.revenue - a.revenue)
            )

            // --- Process Summary Totals ---
            const activeRevenue = totalRev + activePaidSales.reduce((sum: number, s: any) => sum + s.total_amount, 0)
            let activeExpenses = activeTxs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0)
            
            // Sum Recurring Expenses for current period
            const start = new Date(startDate)
            const end = new Date(endDate)
            const periodMonths: { monthYear: string, date: Date }[] = []
            let curr = new Date(start.getFullYear(), start.getMonth(), 1)
            while (curr <= end) {
                periodMonths.push({ 
                    monthYear: `${(curr.getMonth() + 1).toString().padStart(2, '0')}-${curr.getFullYear()}`,
                    date: new Date(curr)
                })
                curr.setMonth(curr.getMonth() + 1)
            }

            const simulatedRecurringTxs: any[] = []
            recExps.forEach(re => {
                periodMonths.forEach(pm => {
                    const reStartDate = new Date(re.start_date)
                    if (reStartDate <= new Date(pm.date.getFullYear(), pm.date.getMonth() + 1, 0)) {
                        const hasEx = recExcs.some(ex => ex.recurring_expense_id === re.id && ex.month_year === pm.monthYear)
                        if (!hasEx) {
                            activeExpenses += Number(re.amount)
                            simulatedRecurringTxs.push({
                                id: `${re.id}-${pm.monthYear}`,
                                recurring_id: re.id,
                                description: re.description,
                                amount: Number(re.amount),
                                category: (re as any).expense_categories?.name || re.category_name || 'Despesa Fixa',
                                date: pm.date.toISOString(),
                                type: 'expense',
                                is_recurring: true,
                                monthYear: pm.monthYear
                            })
                        }
                    }
                })
            })

            // Garantir que pTotal inclua ABSOLUTAMENTE tudo que não está pago
            const pTotal = 
                  allPendingAppts.reduce((sum: number, a: any) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)
                + pendingSales.reduce((sum: number, s: any) => sum + s.total_amount, 0)
                + pendingVets.reduce((sum: number, v: any) => {
                    let val = v.consultation_fee || 0;
                    if (v.discount_type === 'percent') val -= val * ((v.discount_percent || 0) / 100);
                    else val -= (v.discount_fixed || 0);
                    return sum + Math.max(0, val);
                }, 0)
                + pendingExams.reduce((sum: number, e: any) => {
                    let val = e.price || 0;
                    if (e.discount_type === 'percent') val -= val * ((e.discount_percent || 0) / 100);
                    else val -= (e.discount_fixed || 0);
                    return sum + Math.max(0, val);
                }, 0)
                + pendingAdmissions.reduce((sum: number, ad: any) => sum + (ad.total_amount || 0), 0)

            setActiveRevenueValue(activeRevenue)
            setActiveExpensesValue(activeExpenses)
            setPendingTotalValue(pTotal)

            setExtractRecords({
                type: null,
                appointments: activeAppts,
                transactions: [...activeTxs, ...simulatedRecurringTxs],
                pendingSales,
                paidSales: activePaidSales,
                pendingVets,
                pendingExams,
                pendingAdmissions,
                allPendingAppointments: allPendingAppts
            })

        } catch (error) {
            console.error('Erro ao buscar financeiro:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase, startDate, endDate])

    // Helper para buscar notas fiscais filtradas
    const getFilteredNFs = () => {
        // Unifica todas as origens que possuem NF
        const allItems = [
            ...extractRecords.appointments.map(a => ({
                id: a.id,
                cliente: a.pets?.customers?.name || 'Cliente',
                pet: a.pets?.name,
                tipo: 'NFSe',
                data: a.payment_status === 'paid' ? a.paid_at! : a.scheduled_at,
                valor: a.final_price || a.calculated_price || 0,
                status: nfMap[a.id]?.status || 'pendente',
                nfId: nfMap[a.id]?.id,
                pdf_url: nfMap[a.id]?.pdf_url,
                caminho_xml: (nfMap[a.id] as any)?.caminho_xml,
                numero: (nfMap[a.id] as any)?.numero_nf
            })),
            ...extractRecords.paidSales.map(s => ({
                id: s.id,
                cliente: s.pets?.customers?.name || 'Consumidor Final',
                pet: s.pets?.name,
                tipo: 'NFe',
                data: s.created_at,
                valor: s.total_amount,
                status: nfMap[s.id]?.status || 'pendente',
                nfId: nfMap[s.id]?.id,
                pdf_url: nfMap[s.id]?.pdf_url,
                caminho_xml: (nfMap[s.id] as any)?.caminho_xml,
                numero: (nfMap[s.id] as any)?.numero_nf
            }))
        ]

        return allItems.filter(item => {
            const matchesSearch = item.cliente.toLowerCase().includes(nfSearchTerm.toLowerCase()) || 
                               (item.pet && item.pet.toLowerCase().includes(nfSearchTerm.toLowerCase()))
            const matchesStatus = nfStatusFilter === 'all' || item.status === nfStatusFilter
            // Só mostra itens que pelo menos tentaram emissão (têm status diferente de pendente) se estiver no tab de NFs
            return matchesSearch && matchesStatus && item.status !== 'pendente'
        }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    }

    useEffect(() => {
        fetchFinancials()
    }, [fetchFinancials])

    // Realtime subscription for NF updates
    useEffect(() => {
        const channel = supabase
            .channel('nf-updates-financeiro')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notas_fiscais' },
                (payload: any) => {
                    const newNf = payload.new as any
                    if (newNf && newNf.origem_id) {
                        setNfMap(prev => ({
                            ...prev,
                            [newNf.origem_id]: {
                                id: newNf.id,
                                status: newNf.status,
                                pdf_url: newNf.caminho_pdf
                            }
                        }))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const handleOpenExtract = (type: 'revenue' | 'expenses' | 'pending') => {
        setExtractRecords(prev => ({ ...prev, type }))
        setIsExtractModalOpen(true)
    }

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        const res = await createExpenseCategory(newCategoryName)
        if (res.success) {
            setNewCategoryName('')
            setIsCategoryModalOpen(false)
            fetchFinancials()
        } else {
            alert('Erro ao criar categoria: ' + res.message)
        }
    }

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('description', expenseForm.description)
        formData.append('amount', expenseForm.amount.toString())
        formData.append('category_id', expenseForm.category_id)
        formData.append('category_name', expenseForm.category_name)
        formData.append('date', expenseForm.date)
        formData.append('is_recurring', expenseForm.is_recurring.toString())

        const res = await createExpense(formData)
        if (res.success) {
            setIsExpenseModalOpen(false)
            setExpenseForm({
                description: '',
                amount: 0,
                category_id: '',
                category_name: '',
                date: new Date().toISOString().split('T')[0],
                is_recurring: false
            })
            fetchFinancials()
        } else {
            alert('Erro ao criar despesa: ' + res.message)
        }
    }

    const handleSkipRecurringForMonth = async (recurringId: string, monthYear: string) => {
        if (!confirm('Pular esta despesa apenas este mês?')) return
        const res = await cancelRecurringExpenseForMonth(recurringId, monthYear)
        if (res.success) {
            fetchFinancials()
        } else {
            alert('Erro ao pular despesa: ' + res.message)
        }
    }

    const handleDeleteRecurringPermanent = async (recurringId: string) => {
        if (!confirm('Excluir esta despesa permanentemente de todos os meses?')) return
        const res = await deleteRecurringExpense(recurringId)
        if (res.success) {
            fetchFinancials()
        } else {
            alert('Erro ao excluir despesa: ' + res.message)
        }
    }

    const handleOpenPaymentModal = (
        recordId: string,
        tableName: 'appointments' | 'orders' | 'vet_consultations' | 'vet_exams' | 'hospital_admissions',
        title: string,
        baseAmount: number
    ) => {
        setPaymentModal({
            isOpen: true,
            recordId,
            tableName,
            title,
            baseAmount
        })
    }


    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    const handleDeleteTransaction = async (txId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', txId)

            if (error) throw error

            alert('Transação excluída com sucesso!')
            fetchFinancials()
        } catch (error) {
            console.error('Erro ao excluir transação:', error)
            alert('Erro ao excluir transação.')
        }
    }

    const handleSendWhatsApp = async (id: string) => {
        const nf = nfMap[id]
        if (!nf) return

        try {
            const response = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nfId: nf.id })
            })

            if (response.ok) {
                alert('Mensagem enviada para o WhatsApp do tutor!')
            } else {
                const err = await response.json()
                alert('Erro ao enviar WhatsApp: ' + (err.message || 'Erro desconhecido'))
            }
        } catch (error) {
            console.error('Erro ao chamar send-whatsapp:', error)
            alert('Erro ao comunicar com o servidor.')
        }
    }

    const handleOpenNFSe = (appt: any) => {
        setNfConfig({
            tipo: 'nfse',
            origemTipo: 'atendimento',
            refId: appt.id,
            total_amount: appt.final_price || appt.calculated_price || 0,
            tutor: {
                nome: appt.pets?.customers?.name || 'Cliente',
                cpf: appt.pets?.customers?.cpf_cnpj || appt.pets?.customers?.cpf,
                email: appt.pets?.customers?.email,
                endereco: {
                    logradouro: appt.pets?.customers?.address,
                    bairro: appt.pets?.customers?.neighborhood,
                    city: appt.pets?.customers?.city
                }
            },
            servico: {
                descricao: appt.services?.name || 'Serviço',
                valor: appt.final_price || appt.calculated_price || 0
            },
            petName: appt.pets?.name
        })
        setShowNFModal(true)
    }

    const handleOpenCancelNF = (item: any) => {
        setSelectedNfToCancel({
            id: item.nfId,
            numero: item.numero,
            refId: item.id
        })
        setIsCancelModalOpen(true)
    }

    const handleAccountingExport = () => {
        const filtered = getFilteredNFs().filter(n => n.status === 'autorizado')
        const headers = ['Data', 'Tipo', 'Número', 'Cliente', 'Valor', 'Status', 'PDF', 'XML']
        const rows = filtered.map(n => [
            new Date(n.data).toLocaleDateString('pt-BR'),
            n.tipo,
            n.numero || '-',
            n.cliente,
            n.valor.toFixed(2).replace('.', ','),
            n.status.toUpperCase(),
            n.pdf_url || '',
            n.caminho_xml || ''
        ])

        exportToCsv(`relatorio_contabilidade_${startDate}_${endDate}`, headers, rows)
    }

    const handleOpenNFe = (sale: any) => {
        const desc = sale.order_items && sale.order_items.length > 0 
            ? sale.order_items[0].product_name + (sale.order_items.length > 1 ? ` (+${sale.order_items.length - 1} itens)` : '') 
            : 'Venda de Produtos';

        setNfConfig({
            tipo: 'nfe',
            origemTipo: 'venda',
            refId: sale.id,
            total_amount: sale.total_amount,
            tutor: {
                nome: sale.pets?.customers?.name || 'Consumidor Final',
                cpf: sale.pets?.customers?.cpf_cnpj || sale.pets?.customers?.cpf,
                email: sale.pets?.customers?.email,
                endereco: {
                    logradouro: sale.pets?.customers?.address,
                    bairro: sale.pets?.customers?.neighborhood,
                    city: sale.pets?.customers?.city
                }
            },
            produtos: sale.order_items?.map((i: any) => ({
                nome: i.product_name,
                quantidade: 1,
                preco_unitario: sale.total_amount / (sale.order_items?.length || 1)
            }))
        })
        setShowNFModal(true)
    }

    const currentMonthData = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : { revenue: 0, expenses: 0, profit: 0 }
    const previousMonthData = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : { revenue: 0, expenses: 0, profit: 0 }


    const revenueGrowth = previousMonthData.revenue > 0
        ? ((currentMonthData.revenue - previousMonthData.revenue) / previousMonthData.revenue * 100).toFixed(1)
        : '0.0'

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

    const handleExportCSV = () => {
        if (!extractRecords.type) return;

        const headers = extractRecords.type === 'expenses'
            ? ['Categoria', 'Descrição', 'Data', 'Valor']
            : ['Item', 'Data', 'Valor', 'Categoria'];

        const rows: any[][] = [];

        if (extractRecords.type !== 'expenses') {
            extractRecords.appointments
                .filter(a => extractRecords.type === 'revenue' ? a.payment_status === 'paid' : a.payment_status !== 'paid')
                .filter(a => selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory)
                .forEach(appt => {
                    const dateVal = appt.payment_status === 'paid' ? appt.paid_at! : appt.scheduled_at;
                    rows.push([
                        `${appt.pets?.name || 'Pet'} • ${appt.services?.name || 'Serviço'}`,
                        new Date(dateVal).toLocaleDateString('pt-BR'),
                        (appt.final_price || appt.calculated_price || 0).toFixed(2).replace('.', ','),
                        (appt.services as any)?.service_categories?.name || 'Serviços'
                    ])
                })
        }

        if (extractRecords.type !== 'pending') {
            extractRecords.transactions
                .filter(t => extractRecords.type === 'revenue' ? t.type === 'income' : t.type === 'expense')
                .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
                .forEach(tx => {
                    if (extractRecords.type === 'expenses') {
                        rows.push([
                            tx.category,
                            tx.description || '',
                            new Date(tx.date).toLocaleDateString('pt-BR'),
                            tx.amount.toFixed(2).replace('.', ',')
                        ])
                    } else {
                        rows.push([
                            tx.description || 'Transação Avulsa',
                            new Date(tx.date).toLocaleDateString('pt-BR'),
                            tx.amount.toFixed(2).replace('.', ','),
                            tx.category
                        ])
                    }
                })
        }

        if (extractRecords.type === 'pending') {
            extractRecords.pendingSales
                .filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto')
                .forEach(sale => {
                    const dateVal = sale.created_at;
                    const desc = sale.order_items && sale.order_items.length > 0 ? sale.order_items[0].product_name + (sale.order_items.length > 1 ? ` (+${sale.order_items.length - 1} itens)` : '') : 'Venda';
                    rows.push([
                        `${sale.pets?.name || 'Avulso'} • ${desc}`,
                        new Date(dateVal).toLocaleDateString('pt-BR'),
                        sale.total_amount.toFixed(2).replace('.', ','),
                        'Venda Produto'
                    ])
                })
        }

        exportToCsv(`financeiro_${extractRecords.type}`, headers, rows)
    }

    const handleExportPDF = () => {
        if (!extractRecords.type) return;

        const title =
            extractRecords.type === 'revenue' ? 'Extrato de Faturamento' :
                extractRecords.type === 'expenses' ? 'Extrato de Despesas' : 'Valores a Receber';

        const doc = new jsPDF()
        doc.text(title, 14, 15)

        const headers = extractRecords.type === 'expenses'
            ? [['Categoria', 'Descrição', 'Data', 'Valor']]
            : [['Item', 'Data', 'Valor', 'Categoria']];

        const rows: any[][] = [];

        if (extractRecords.type !== 'expenses') {
            extractRecords.appointments
                .filter(a => extractRecords.type === 'revenue' ? a.payment_status === 'paid' : a.payment_status !== 'paid')
                .filter(a => selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory)
                .forEach(appt => {
                    const dateVal = appt.payment_status === 'paid' ? appt.paid_at! : appt.scheduled_at;
                    rows.push([
                        `${appt.pets?.name || 'Pet'} • ${appt.services?.name || 'Serviço'}`,
                        new Date(dateVal).toLocaleDateString('pt-BR'),
                        formatCurrency(appt.final_price || appt.calculated_price || 0),
                        (appt.services as any)?.service_categories?.name || 'Serviços'
                    ])
                })
        }

        if (extractRecords.type !== 'pending') {
            extractRecords.transactions
                .filter(t => extractRecords.type === 'revenue' ? t.type === 'income' : t.type === 'expense')
                .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
                .forEach(tx => {
                    if (extractRecords.type === 'expenses') {
                        rows.push([
                            tx.category,
                            tx.description || '',
                            new Date(tx.date).toLocaleDateString('pt-BR'),
                            formatCurrency(tx.amount)
                        ])
                    } else {
                        rows.push([
                            tx.description || 'Transação Avulsa',
                            new Date(tx.date).toLocaleDateString('pt-BR'),
                            formatCurrency(tx.amount),
                            tx.category
                        ])
                    }
                })
        }

        if (extractRecords.type === 'pending') {
            extractRecords.pendingSales
                .filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto')
                .forEach(sale => {
                    const dateVal = sale.created_at;
                    const desc = sale.order_items && sale.order_items.length > 0 ? sale.order_items[0].product_name + (sale.order_items.length > 1 ? ` (+${sale.order_items.length - 1} itens)` : '') : 'Venda';
                    rows.push([
                        `${sale.pets?.name || 'Avulso'} • ${desc}`,
                        new Date(dateVal).toLocaleDateString('pt-BR'),
                        formatCurrency(sale.total_amount),
                        'Venda Produto'
                    ])
                })
        }

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 20,
            styles: { fontSize: 9 },
            theme: 'striped'
        })

        doc.save(`financeiro_${extractRecords.type}.pdf`)
    }

    if (loading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Carregando dados financeiros...</div>
            </div>
        )
    }

    return (
        <PlanGuard requiredModule="financeiro">
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                        <h1 className={styles.title}>💰 Controle Financeiro</h1>
                        <p className={styles.subtitle}>Visão geral das finanças do seu pet shop</p>
                    </div>
                    <div className={styles.filters}>
                        <div className={styles.filterGroup}>
                            <label>De:</label>
                            <DateInput
                                name="startDate"
                                value={startDate}
                                onChange={setStartDate}
                                className={styles.dateInput}
                                yearRange={[2020, new Date().getFullYear() + 1]}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Até:</label>
                            <DateInput
                                name="endDate"
                                value={endDate}
                                onChange={setEndDate}
                                className={styles.dateInput}
                                yearRange={[2020, new Date().getFullYear() + 1]}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Categoria:</label>
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">Todas</option>
                                {categoryRevenue.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className={styles.summaryGrid}>
                    <div
                        className={`${styles.summaryCard} ${styles.clickable}`}
                        onClick={() => handleOpenExtract('revenue')}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>💵</span>
                            <span className={`${styles.cardGrowth} ${Number(revenueGrowth) >= 0 ? styles.positive : styles.negative}`}>
                                {Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%
                            </span>
                        </div>
                        <span className={styles.cardValue}>{formatCurrency(activeRevenueValue)}</span>
                        <span className={styles.cardLabel}>Faturamento</span>
                    </div>

                    <div className={`${styles.summaryCard} ${styles.clickable}`}>
                        <div className={styles.cardHeader} onClick={() => handleOpenExtract('expenses')}>
                            <span className={styles.cardIcon}>📉</span>
                            <button 
                                className={styles.addExpenseBtn}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsExpenseModalOpen(true)
                                }}
                            >
                                <Plus size={16} /> Nova Despesa
                            </button>
                        </div>
                        <div onClick={() => handleOpenExtract('expenses')} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className={styles.cardValue}>{formatCurrency(activeExpensesValue)}</span>
                            <span className={styles.cardLabel}>Despesas</span>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>📈</span>
                        </div>
                        <span className={`${styles.cardValue} ${styles.profit}`}>{formatCurrency(activeRevenueValue - activeExpensesValue)}</span>
                        <span className={styles.cardLabel}>Lucro Líquido</span>
                    </div>

                    <div
                        className={`${styles.summaryCard} ${styles.clickable}`}
                        onClick={() => handleOpenExtract('pending')}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>⏳</span>
                        </div>
                        <span className={styles.cardValue} style={{ color: '#f39c12' }}>{formatCurrency(pendingTotalValue)}</span>
                        <span className={styles.cardLabel}>A Receber</span>
                    </div>
                </div>

                {/* MODAL NOVA DESPESA */}
                {isExpenseModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <PlusCircle size={24} color="var(--color-primary)" /> Nova Despesa
                                </h2>
                                <button onClick={() => setIsExpenseModalOpen(false)} className={styles.closeBtn}><XCircle /></button>
                            </div>
                            <form onSubmit={handleCreateExpense} className={styles.expenseForm}>
                                <div className={styles.formGroup}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={16} /> Descrição
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={expenseForm.description}
                                        onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                                        placeholder="Ex: Aluguel, Luz, Fornecedor X..."
                                    />
                                </div>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <DollarSign size={16} /> Valor
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            required
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})}
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={16} /> Data
                                        </label>
                                        <input 
                                            type="date" 
                                            required
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Tag size={16} /> Categoria
                                        </label>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsCategoryModalOpen(true)}
                                            className={styles.addSmallBtn}
                                        >
                                            + Nova Categoria
                                        </button>
                                    </div>
                                    <select 
                                        required 
                                        value={expenseForm.category_id}
                                        onChange={e => {
                                            const cat = expenseCategories.find(c => c.id === e.target.value)
                                            setExpenseForm({
                                                ...expenseForm, 
                                                category_id: e.target.value,
                                                category_name: cat?.name || ''
                                            })
                                        }}
                                    >
                                        <option value="">Selecione uma categoria...</option>
                                        {expenseCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formCheck}>
                                    <label className={styles.checkboxLabel}>
                                        <input 
                                            type="checkbox"
                                            checked={expenseForm.is_recurring}
                                            onChange={e => setExpenseForm({...expenseForm, is_recurring: e.target.checked})}
                                        />
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Repeat size={16} /> Esta é uma despesa fixa (recorrente mensal)
                                        </span>
                                    </label>
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setIsExpenseModalOpen(false)} className={styles.cancelBtn}>Cancelar</button>
                                    <button type="submit" className={styles.confirmBtn}>Salvar Despesa</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL NOVA CATEGORIA */}
                {isCategoryModalOpen && (
                    <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
                        <div className={styles.modalContent} style={{ maxWidth: '450px' }}>
                            <div className={styles.modalHeader}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Tag size={24} color="var(--color-primary)" /> Nova Categoria
                                </h2>
                                <button onClick={() => setIsCategoryModalOpen(false)} className={styles.closeBtn}><XCircle /></button>
                            </div>
                            <form onSubmit={handleCreateCategory} className={styles.expenseForm}>
                                <div className={styles.formGroup}>
                                    <label>Nome da Categoria</label>
                                    <input 
                                        type="text" 
                                        required 
                                        autoFocus
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        placeholder="Ex: Impostos, Salários, Aluguel..."
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setIsCategoryModalOpen(false)} className={styles.cancelBtn}>Cancelar</button>
                                    <button type="submit" className={styles.confirmBtn}>Criar Categoria</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isExtractModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={`${styles.modalContent} ${styles.extractModal}`}>
                            <div className={styles.modalHeader}>
                                <h2>
                                    {extractRecords.type === 'revenue' ? '📈 Extrato de Faturamento' : 
                                     extractRecords.type === 'expenses' ? '📉 Extrato de Despesas' : '⏳ Valores a Receber'}
                                </h2>
                                <div className={styles.headerActions}>
                                    <button onClick={handleExportCSV} className={styles.exportBtn} title="Exportar CSV"><Download size={18} /></button>
                                    <button onClick={handleExportPDF} className={styles.exportBtn} title="Exportar PDF"><FileText size={18} /></button>
                                    <button onClick={() => setIsExtractModalOpen(false)} className={styles.closeBtn}><XCircle /></button>
                                </div>
                            </div>

                            <div className={styles.extractFilters}>
                                <div className={styles.searchBox}>
                                    <Search size={18} />
                                    <input type="text" placeholder="Buscar por descrição..." />
                                </div>
                            </div>

                            <div className={styles.extractTable}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Descrição</th>
                                            <th>Categoria</th>
                                            <th>Valor</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractRecords.type === 'expenses' && extractRecords.transactions
                                            .filter(t => t.type === 'expense')
                                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((tx: any) => (
                                            <tr key={tx.id}>
                                                <td>{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {tx.description}
                                                        {tx.is_recurring && <span className={styles.recurringTag}><Repeat size={10} /> FIXA</span>}
                                                    </div>
                                                </td>
                                                <td>{tx.category}</td>
                                                <td className={styles.expenseValue}>- {formatCurrency(tx.amount)}</td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        {tx.is_recurring ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleSkipRecurringForMonth(tx.recurring_id, tx.monthYear)}
                                                                    className={styles.actionBtn}
                                                                    title="Pular apenas este mês"
                                                                >
                                                                    <Calendar size={18} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteRecurringPermanent(tx.recurring_id)}
                                                                    className={styles.deleteBtn}
                                                                    title="Excluir permanentemente"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => handleDeleteTransaction(tx.id)} className={styles.deleteBtn}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {extractRecords.type === 'revenue' && (
                                            <>
                                                {extractRecords.transactions.filter(t => t.type === 'income').map((tx: any) => (
                                                    <tr key={tx.id}>
                                                        <td>{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                                        <td>{tx.description}</td>
                                                        <td>{tx.category}</td>
                                                        <td className={styles.revenueValue}>+ {formatCurrency(tx.amount)}</td>
                                                        <td>
                                                            <button onClick={() => handleDeleteTransaction(tx.id)} className={styles.deleteBtn}><Trash2 size={18} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {extractRecords.appointments.filter(a => a.payment_status === 'paid').map((appt: any) => (
                                                    <tr key={appt.id}>
                                                        <td>{new Date(appt.paid_at).toLocaleDateString('pt-BR')}</td>
                                                        <td>{appt.pets?.name} • {appt.services?.name}</td>
                                                        <td>{(appt.services as any)?.service_categories?.name || 'Serviços'}</td>
                                                        <td className={styles.revenueValue}>+ {formatCurrency(appt.final_price || appt.calculated_price || 0)}</td>
                                                        <td>
                                                            <div className={styles.actionButtons}>
                                                                <button onClick={() => handleSendWhatsApp(appt.id)} className={styles.actionBtn} title="WhatsApp"><Send size={18} /></button>
                                                                <button onClick={() => handleOpenNFSe(appt)} className={styles.actionBtn} title="Emitir NF"><FileCode size={18} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {extractRecords.paidSales.map((sale: any) => (
                                                    <tr key={sale.id}>
                                                        <td>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                                                        <td>Venda Petshop</td>
                                                        <td>Produtos</td>
                                                        <td className={styles.revenueValue}>+ {formatCurrency(sale.total_amount)}</td>
                                                        <td>
                                                            <button onClick={() => handleOpenNFe(sale)} className={styles.actionBtn} title="Emitir NF"><FileCode size={18} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        )}

                                        {extractRecords.type === 'pending' && (
                                            <>
                                                {extractRecords.allPendingAppointments.map((appt: any) => (
                                                    <tr key={appt.id}>
                                                        <td>{new Date(appt.scheduled_at).toLocaleDateString('pt-BR')}</td>
                                                        <td>{appt.pets?.name} • {appt.services?.name}</td>
                                                        <td>{(appt.services as any)?.service_categories?.name || 'Serviços'}</td>
                                                        <td className={styles.pendingValue}>{formatCurrency(appt.final_price || appt.calculated_price || 0)}</td>
                                                        <td>
                                                            <button 
                                                                onClick={() => handleOpenPaymentModal(appt.id, 'appointments', (appt.services?.name || 'Serviço'), (appt.final_price || appt.calculated_price || 0))}
                                                                className={styles.payBtn}
                                                            >
                                                                <DollarSign size={16} /> Receber
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {extractRecords.pendingSales.map((sale: any) => (
                                                    <tr key={sale.id}>
                                                        <td>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                                                        <td>Venda Petshop</td>
                                                        <td>Produtos</td>
                                                        <td className={styles.pendingValue}>{formatCurrency(sale.total_amount)}</td>
                                                        <td>
                                                            <button 
                                                                onClick={() => handleOpenPaymentModal(sale.id, 'orders', 'Venda Petshop', sale.total_amount)}
                                                                className={styles.payBtn}
                                                            >
                                                                <DollarSign size={16} /> Receber
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Revenue Chart */}
                <div className={styles.chartSection}>
                    <h2 className={styles.sectionTitle}>📊 Faturamento Mensal (Últimos 6 Meses)</h2>
                    {monthlyData.length > 0 ? (
                        <div className={styles.chart}>
                            {/* Background Grid Lines */}
                            <div className={styles.gridLines}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className={styles.gridLine} />
                                ))}
                            </div>
                            {monthlyData.map((data, index) => (
                                <div key={data.month} className={styles.chartBar}>
                                    <div className={styles.barContainer}>
                                        <div
                                            className={styles.bar}
                                            style={{ height: `${(data.revenue / maxRevenue) * 100}%` }}
                                        >
                                            <span className={styles.barValue}>
                                                {data.revenue >= 1000
                                                    ? `${(data.revenue / 1000).toFixed(1)}k`
                                                    : data.revenue > 0 ? data.revenue.toFixed(0) : '0'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`${styles.barLabel} ${index === monthlyData.length - 1 ? styles.current : ''}`}>
                                        {data.month}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Sem dados financeiros registrados.</p>
                    )}
                </div>

                {/* Revenue by Service */}
                <div className={styles.servicesSection}>
                    <h2 className={styles.sectionTitle}>💼 Receita por Categoria</h2>
                    <div className={styles.servicesList}>
                        {categoryRevenue.map(cat => (
                            <div key={cat.name} className={styles.serviceItem}>
                                <div className={styles.serviceHeader}>
                                    <span className={styles.serviceName}>{cat.name}</span>
                                    <span className={styles.serviceRevenue}>{formatCurrency(cat.revenue)}</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progress}
                                        style={{ width: `${cat.percentage}%` }}
                                    />
                                </div>
                                <div className={styles.serviceFooter}>
                                    <span className={styles.serviceCount}>{cat.count} vendas</span>
                                    <span className={styles.servicePercentage}>{cat.percentage}%</span>
                                </div>
                            </div>
                        ))}
                        {categoryRevenue.length === 0 && (
                            <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>Nenhuma venda registrada este mês.</p>
                        )}
                    </div>
                </div>

                {/* Quick Stats - Removed fake stats */}

                {showNFModal && nfConfig && (
                    <EmitirNFModal
                        {...nfConfig}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={() => {
                            setShowNFModal(false)
                            fetchFinancials()
                        }}
                    />
                )}

                {isCancelModalOpen && selectedNfToCancel && (
                    <CancelamentoNFModal
                        nfId={selectedNfToCancel.id}
                        numeroNf={selectedNfToCancel.numero}
                        onClose={() => setIsCancelModalOpen(false)}
                        onSuccess={() => {
                            setIsCancelModalOpen(false)
                            fetchFinancials()
                            alert('Nota fiscal cancelada com sucesso!')
                        }}
                    />
                )}

                {paymentModal?.isOpen && (
                    <FinanceiroPaymentModal
                        recordId={paymentModal.recordId}
                        tableName={paymentModal.tableName}
                        title={paymentModal.title}
                        baseAmount={paymentModal.baseAmount}
                        onClose={() => setPaymentModal(null)}
                        onSuccess={() => {
                            setPaymentModal(null)
                            fetchFinancials()
                        }}
                    />
                )}
            </div>
        </PlanGuard>
    )
}
