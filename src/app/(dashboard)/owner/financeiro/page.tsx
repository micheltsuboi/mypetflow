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
import { Search, Filter, Download, XCircle, FileText, ExternalLink, Send, Trash2, ChevronRight, FileCode } from 'lucide-react'
import CancelamentoNFModal from '@/components/CancelamentoNFModal'

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
    }>({
        type: null,
        appointments: [],
        transactions: [],
        pendingSales: [],
        paidSales: []
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

            const [apptsResponse, txsResponse, pendingSalesResponse, paidSalesResponse] = await Promise.all([
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
                    .order('created_at', { ascending: true })
            ])

            if (apptsResponse.error) throw apptsResponse.error
            if (txsResponse.error) throw txsResponse.error
            if (pendingSalesResponse.error) throw pendingSalesResponse.error
            if (paidSalesResponse.error) throw paidSalesResponse.error

            const appointments = apptsResponse.data || []
            const transactions = txsResponse.data || []
            const pendingSales = pendingSalesResponse.data || []
            const paidSales = paidSalesResponse.data || []

            // --- Process Monthly Chart Data (Last 6 Months) ---
            const monthMap = new Map<string, MonthlyData>()
            for (let i = 0; i < 6; i++) {
                const d = new Date(sixMonthsAgo)
                d.setMonth(d.getMonth() + i)
                const monthKey = d.toLocaleString('pt-BR', { month: 'short' })
                monthMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0 })
            }

            // Add Appointments to Chart
            appointments.forEach(appt => {
                const dateAt = appt.payment_status === 'paid' ? appt.paid_at! : appt.scheduled_at
                const date = new Date(dateAt)
                const monthKey = date.toLocaleString('pt-BR', { month: 'short' })
                if (monthMap.has(monthKey) && appt.payment_status === 'paid') {
                    const data = monthMap.get(monthKey)!
                    data.revenue += (appt.final_price ?? appt.calculated_price ?? 0)
                }
            })

            // Add Transactions to Chart
            transactions.forEach(t => {
                const date = new Date(t.date)
                const monthKey = date.toLocaleString('pt-BR', { month: 'short' })
                const data = monthMap.get(monthKey)
                if (data) {
                    if (t.type === 'income') data.revenue += t.amount
                    else data.expenses += t.amount
                    data.profit = data.revenue - data.expenses
                }
            })
            setMonthlyData(Array.from(monthMap.values()))

            // Fetch NF Status for all revenue items
            const allRevenueIds = [
                ...appointments.filter(a => a.payment_status === 'paid').map(a => a.id),
                ...pendingSales.map(s => s.id),
                ...paidSales.map(s => s.id)
            ]

            if (allRevenueIds.length > 0) {
                const { data: nfs } = await supabase
                    .from('notas_fiscais')
                    .select('id, origem_id, status, caminho_pdf')
                    .in('origem_id', allRevenueIds)

                if (nfs) {
                    const map: any = {}
                    nfs.forEach(nf => {
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

            const activeAppts = appointments.filter(a => filterByPeriod(a.payment_status === 'paid' ? a.paid_at! : a.scheduled_at))
            const activeTxs = transactions.filter(t => filterByPeriod(t.date))
            const activePaidSales = paidSales.filter(s => filterByPeriod(s.created_at))

            const catMap = new Map<string, CategoryRevenue>()
            let totalRev = 0

            // Combine income sources for categories
            activeAppts.forEach(a => {
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

            activeTxs.forEach(t => {
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
                    .map(c => ({
                        ...c,
                        percentage: totalRev > 0 ? parseFloat(((c.revenue / totalRev) * 100).toFixed(1)) : 0
                    }))
                    .sort((a, b) => b.revenue - a.revenue)
            )

            setExtractRecords({
                type: null,
                appointments: activeAppts,
                transactions: activeTxs,
                pendingSales,
                paidSales: activePaidSales
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
                (payload) => {
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

    const handleConfirmPayment = async (appointmentId: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    paid_at: new Date().toISOString()
                })
                .eq('id', appointmentId)

            if (error) throw error

            fetchFinancials() // Direct refresh

            if (confirm('Pagamento confirmado com sucesso! Deseja emitir a Nota Fiscal agora?')) {
                const appt = extractRecords.appointments.find(a => a.id === appointmentId)
                if (appt) {
                    setNfConfig({
                        tipo: 'nfse',
                        origemTipo: 'atendimento',
                        refId: appt.id,
                        total_amount: appt.final_price ?? appt.calculated_price ?? 0,
                        tutor: {
                            nome: appt.pets?.customers?.name,
                            cpf: appt.pets?.customers?.cpf || appt.pets?.customers?.cpf_cnpj,
                            email: appt.pets?.customers?.email,
                            endereco: {
                                logradouro: appt.pets?.customers?.address,
                                bairro: appt.pets?.customers?.neighborhood,
                                codigo_municipio: appt.pets?.customers?.city
                            }
                        },
                        servico: {
                            descricao: appt.services?.name || 'Serviço Veterinário/Estética',
                            valor: appt.final_price ?? appt.calculated_price ?? 0,
                            codigo: "08.02"
                        },
                        petName: appt.pets?.name,
                        tutorPhone: appt.pets?.customers?.phone_1
                    })
                    setShowNFModal(true)
                }
            }
        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error)
            alert('Erro ao confirmar pagamento.')
        }
    }

    const handleConfirmPetshopPayment = async (orderId: string, description: string, price: number) => {
        if (confirm(`Confirmar pagamento de R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${description}?`)) {
            const paymentMethod = prompt('Qual a forma de pagamento? (pix, cash, credit, debit)', 'pix')
            if (paymentMethod) {
                const res = await payPetshopSale(orderId, paymentMethod)
                if (res.success) {
                    fetchFinancials()
                    if (confirm(res.message + ' Deseja emitir a NFe agora?')) {
                        const sale = extractRecords.paidSales.find(s => s.id === orderId) || extractRecords.pendingSales.find(s => s.id === orderId)
                        if (sale) {
                            setNfConfig({
                                tipo: 'nfe',
                                origemTipo: 'pdv',
                                refId: sale.id,
                                total_amount: sale.total_amount,
                                tutor: {
                                    nome: sale.pets?.customers?.name || 'Consumidor Final',
                                    cpf: sale.pets?.customers?.cpf || sale.pets?.customers?.cpf_cnpj,
                                    email: sale.pets?.customers?.email,
                                    endereco: {
                                        logradouro: sale.pets?.customers?.address,
                                        bairro: sale.pets?.customers?.neighborhood,
                                        codigo_municipio: sale.pets?.customers?.city
                                    }
                                },
                                produtos: sale.order_items?.map((item: any) => ({
                                    descricao: item.product_name,
                                    valor_unitario: sale.total_amount / (sale.order_items.length || 1),
                                    quantidade: 1
                                })) || [],
                                petName: sale.pets?.name,
                                tutorPhone: sale.pets?.customers?.phone_1
                            })
                            setShowNFModal(true)
                        }
                    }
                } else {
                    alert(res.message)
                }
            }
        }
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

    const activeRevenue = extractRecords.appointments
        .filter(a => a.payment_status === 'paid' && (selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory))
        .reduce((sum, a) => sum + (a.final_price ?? a.calculated_price ?? 0), 0) +
        extractRecords.transactions
            .filter(t => t.type === 'income' && (selectedCategory === 'all' || t.category === selectedCategory))
            .reduce((sum, t) => sum + t.amount, 0)

    const activeExpenses = extractRecords.transactions
        .filter(t => t.type === 'expense' && (selectedCategory === 'all' || t.category === selectedCategory))
        .reduce((sum, t) => sum + t.amount, 0)

    const activeProfit = activeRevenue - activeExpenses

    const pendingTotal = extractRecords.appointments
        .filter(a => a.payment_status !== 'paid' && (selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory))
        .reduce((sum, a) => sum + (a.final_price ?? a.calculated_price ?? 0), 0)
        + extractRecords.pendingSales
            .filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto')
            .reduce((sum, s) => sum + s.total_amount, 0)

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
                        <span className={styles.cardValue}>{formatCurrency(activeRevenue)}</span>
                        <span className={styles.cardLabel}>Faturamento</span>
                    </div>

                    <div
                        className={`${styles.summaryCard} ${styles.clickable}`}
                        onClick={() => handleOpenExtract('expenses')}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>📉</span>
                        </div>
                        <span className={`${styles.cardValue} ${styles.expenses}`}>{formatCurrency(activeExpenses)}</span>
                        <span className={styles.cardLabel}>Despesas</span>
                    </div>

                    <div
                        className={`${styles.summaryCard} ${styles.clickable}`}
                        onClick={() => handleOpenExtract('revenue')}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>📈</span>
                        </div>
                        <span className={`${styles.cardValue} ${styles.profit}`}>{formatCurrency(activeProfit)}</span>
                        <span className={styles.cardLabel}>Lucro Líquido</span>
                    </div>

                    <div
                        className={`${styles.summaryCard} ${styles.clickable}`}
                        onClick={() => handleOpenExtract('pending')}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.cardIcon}>⏳</span>
                        </div>
                        <span className={styles.cardValue} style={{ color: '#f39c12' }}>{formatCurrency(pendingTotal)}</span>
                        <span className={styles.cardLabel}>A Receber</span>
                    </div>
                </div>

                {/* Extract Modal */}
                {isExtractModalOpen && extractRecords.type && (
                    <div className={styles.modalOverlay} onClick={() => setIsExtractModalOpen(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeButton} onClick={() => setIsExtractModalOpen(false)}>×</button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', paddingRight: '2rem' }}>
                                <h2 style={{ margin: 0 }}>
                                    {extractRecords.type === 'revenue' && '📜 Extrato de Faturamento'}
                                    {extractRecords.type === 'expenses' && '📉 Extrato de Despesas'}
                                    {extractRecords.type === 'pending' && '⏳ Valores a Receber'}
                                </h2>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setModalTab(modalTab === 'extrato' ? 'nfs' : 'extrato')}
                                        style={{ 
                                            padding: '0.4rem 0.8rem', 
                                            background: modalTab === 'nfs' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                                            border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                            marginRight: '1rem'
                                        }}
                                    >
                                        {modalTab === 'extrato' ? '📄 Ver Notas Fiscais' : '⬅️ Ver Lançamentos'}
                                    </button>
                                    
                                    {modalTab === 'extrato' ? (
                                        <>
                                            <button
                                                onClick={handleExportCSV}
                                                style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                            >
                                                Exportar CSV
                                            </button>
                                            <button
                                                onClick={handleExportPDF}
                                                style={{ padding: '0.4rem 0.8rem', background: '#3498db', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                                            >
                                                Exportar PDF
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleAccountingExport}
                                            style={{ padding: '0.4rem 0.8rem', background: '#27ae60', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                            <Download size={14} style={{ marginRight: '4px' }} />
                                            Exportar p/ Contabilidade
                                        </button>
                                    )}
                                </div>
                            </div>

                            {modalTab === 'extrato' ? (
                                <div className={styles.extractList}>
                                {/* Appointments list (for Revenue and Pending) */}
                                {extractRecords.type !== 'expenses' && extractRecords.appointments
                                    .filter(a => extractRecords.type === 'revenue' ? a.payment_status === 'paid' : a.payment_status !== 'paid')
                                    .filter(a => selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory)
                                    .map(appt => (
                                        <div key={appt.id} className={styles.extractItem}>
                                            <div className={styles.extractInfo}>
                                                <strong>{appt.pets?.name || 'Pet'} • {appt.services?.name || 'Serviço'}</strong>
                                                <span>{new Date(appt.payment_status === 'paid' ? appt.paid_at! : appt.scheduled_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className={styles.extractActions}>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginRight: '1rem' }}>
                                                    {!nfMap[appt.id] ? (
                                                        <button 
                                                            style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                            onClick={() => handleOpenNFSe(appt)}
                                                        >
                                                            🧾 NFSe
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: '0.65rem', padding: '2px 4px', background: nfMap[appt.id].status === 'autorizado' ? '#059669' : '#d97706', color: 'white', borderRadius: '3px' }}>
                                                                {nfMap[appt.id].status.toUpperCase()}
                                                            </span>
                                                            {nfMap[appt.id].pdf_url && (
                                                                <button onClick={() => window.open(nfMap[appt.id].pdf_url, '_blank')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📄</button>
                                                            )}
                                                            {nfMap[appt.id].status === 'autorizado' && (
                                                                <button onClick={() => handleSendWhatsApp(appt.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📲</button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <span className={styles.extractAmount}>
                                                    {formatCurrency(appt.final_price || appt.calculated_price || 0)}
                                                </span>
                                                {extractRecords.type === 'pending' && (
                                                    <button
                                                        className={styles.confirmPayBtn}
                                                        onClick={() => handleConfirmPayment(appt.id)}
                                                    >
                                                        Confirmar Pago
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                {/* Pending Pet Shop Sales list */}
                                {extractRecords.type === 'pending' && extractRecords.pendingSales
                                    .filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto')
                                    .map(sale => {
                                        const desc = sale.order_items && sale.order_items.length > 0 ? sale.order_items[0].product_name + (sale.order_items.length > 1 ? ` (+${sale.order_items.length - 1} itens)` : '') : 'Venda';
                                        return (
                                            <div key={sale.id} className={styles.extractItem}>
                                                <div className={styles.extractInfo}>
                                                    <strong>{sale.pets?.name || 'Cliente Avulso'} • {desc}</strong>
                                                    <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <div className={styles.extractActions}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginRight: '1rem' }}>
                                                        {!nfMap[sale.id] ? (
                                                            <button 
                                                                style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                onClick={() => handleOpenNFe(sale)}
                                                            >
                                                                🧾 NFe
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: '0.65rem', padding: '2px 4px', background: nfMap[sale.id].status === 'autorizado' ? '#059669' : '#d97706', color: 'white', borderRadius: '3px' }}>
                                                                    {nfMap[sale.id].status.toUpperCase()}
                                                                </span>
                                                                {nfMap[sale.id].pdf_url && (
                                                                    <button onClick={() => window.open(nfMap[sale.id].pdf_url, '_blank')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📄</button>
                                                                )}
                                                                {nfMap[sale.id].status === 'autorizado' && (
                                                                    <button onClick={() => handleSendWhatsApp(sale.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📲</button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className={styles.extractAmount}>
                                                        {formatCurrency(sale.total_amount)}
                                                    </span>
                                                    <button
                                                        className={styles.confirmPayBtn}
                                                        onClick={() => handleConfirmPetshopPayment(sale.id, desc, sale.total_amount)}
                                                    >
                                                        Confirmar Pago
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}

                                {/* Paid Pet Shop Sales list (Revenue list) */}
                                {extractRecords.type === 'revenue' && extractRecords.paidSales
                                    .filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto')
                                    .map(sale => {
                                        const desc = sale.order_items && sale.order_items.length > 0 ? sale.order_items[0].product_name + (sale.order_items.length > 1 ? ` (+${sale.order_items.length - 1} itens)` : '') : 'Venda';
                                        return (
                                            <div key={sale.id} className={styles.extractItem}>
                                                <div className={styles.extractInfo}>
                                                    <strong>{sale.pets?.name || 'Cliente Avulso'} • {desc}</strong>
                                                    <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <div className={styles.extractActions}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginRight: '1rem' }}>
                                                        {!nfMap[sale.id] ? (
                                                            <button 
                                                                style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                onClick={() => handleOpenNFe(sale)}
                                                            >
                                                                🧾 NFe
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: '0.65rem', padding: '2px 4px', background: nfMap[sale.id].status === 'autorizado' ? '#059669' : '#d97706', color: 'white', borderRadius: '3px' }}>
                                                                    {nfMap[sale.id].status.toUpperCase()}
                                                                </span>
                                                                {nfMap[sale.id].pdf_url && (
                                                                    <button onClick={() => window.open(nfMap[sale.id].pdf_url, '_blank')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📄</button>
                                                                )}
                                                                {nfMap[sale.id].status === 'autorizado' && (
                                                                    <button onClick={() => handleSendWhatsApp(sale.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>📲</button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className={styles.extractAmount}>
                                                        {formatCurrency(sale.total_amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}

                                {/* Transactions list (for Revenue and Expenses) */}
                                {extractRecords.type !== 'pending' && extractRecords.transactions
                                    .filter(t => extractRecords.type === 'revenue' ? t.type === 'income' : t.type === 'expense')
                                    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
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
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDeleteTransaction(tx.id)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                {/* Empty State */}
                                {((extractRecords.type === 'pending' &&
                                    extractRecords.appointments.filter(a => a.payment_status !== 'paid' && (selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory)).length === 0 &&
                                    extractRecords.pendingSales.filter(s => selectedCategory === 'all' || selectedCategory === 'Venda Produto').length === 0) ||
                                    (extractRecords.type === 'expenses' && extractRecords.transactions.filter(t => t.type === 'expense' && (selectedCategory === 'all' || t.category === selectedCategory)).length === 0) ||
                                    (extractRecords.type === 'revenue' &&
                                        extractRecords.appointments.filter(a => a.payment_status === 'paid' && (selectedCategory === 'all' || (a.services as any)?.service_categories?.name === selectedCategory)).length === 0 &&
                                        extractRecords.transactions.filter(t => t.type === 'income' && (selectedCategory === 'all' || t.category === selectedCategory)).length === 0)) && (
                                        <p className={styles.emptyExtract}>Nenhum registro encontrado para este período/categoria.</p>
                                    )}
                            </div>
                            ) : (
                                <div className={styles.nfDashboard}>
                                    {/* NF Filters */}
                                    <div className={styles.nfFiltersRow}>
                                        <div className={styles.nfSearch}>
                                            <Search size={18} className={styles.searchIcon} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por cliente ou pet..." 
                                                value={nfSearchTerm}
                                                onChange={e => setNfSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <select 
                                            value={nfStatusFilter} 
                                            onChange={e => setNfStatusFilter(e.target.value)}
                                            className={styles.nfStatusSelect}
                                        >
                                            <option value="all">Todos os Status</option>
                                            <option value="autorizado">Autorizadas</option>
                                            <option value="processando">Processando</option>
                                            <option value="erro">Com Erro</option>
                                            <option value="cancelado">Canceladas</option>
                                        </select>
                                    </div>

                                    {/* NF Table */}
                                    <div className={styles.nfTableWrapper}>
                                        <table className={styles.nfTable}>
                                            <thead>
                                                <tr>
                                                    <th>Data</th>
                                                    <th>Cliente</th>
                                                    <th>Tipo</th>
                                                    <th>Valor</th>
                                                    <th>Status</th>
                                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getFilteredNFs().map(nf => (
                                                    <tr key={nf.id}>
                                                        <td>{new Date(nf.data).toLocaleDateString('pt-BR')}</td>
                                                        <td>
                                                            <div className={styles.nfClientInfo}>
                                                                <strong>{nf.cliente}</strong>
                                                                <span>{nf.pet}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`${styles.nfBadge} ${styles[nf.tipo.toLowerCase()]}`}>
                                                                {nf.tipo}
                                                            </span>
                                                        </td>
                                                        <td className={styles.nfValue}>{formatCurrency(nf.valor)}</td>
                                                        <td>
                                                            <span className={`${styles.statusBadge} ${styles[nf.status]}`}>
                                                                {nf.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className={styles.nfActionsRow}>
                                                                {nf.status === 'autorizado' && (
                                                                    <>
                                                                        {nf.pdf_url && (
                                                                            <button 
                                                                                className={styles.nfActionBtn} 
                                                                                onClick={() => window.open(nf.pdf_url, '_blank')}
                                                                                title="Ver PDF (DANFE)"
                                                                            >
                                                                                <FileText size={16} />
                                                                                <span>PDF</span>
                                                                            </button>
                                                                        )}
                                                                        {nf.caminho_xml && (
                                                                            <button 
                                                                                className={`${styles.nfActionBtn} ${styles.xmlBtn}`}
                                                                                onClick={() => window.open(nf.caminho_xml!.startsWith('http') ? nf.caminho_xml! : `https://api.focusnfe.com.br${nf.caminho_xml}`, '_blank')}
                                                                                title="Baixar XML"
                                                                            >
                                                                                <FileCode size={16} />
                                                                                <span>XML</span>
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            className={styles.nfActionBtn}
                                                                            onClick={() => handleSendWhatsApp(nf.id)}
                                                                            title="Enviar WhatsApp"
                                                                        >
                                                                            <Send size={16} />
                                                                        </button>
                                                                        <button 
                                                                            className={`${styles.nfActionBtn} ${styles.cancelNFBtn}`}
                                                                            onClick={() => handleOpenCancelNF(nf)}
                                                                            title="Cancelar Nota"
                                                                        >
                                                                            <XCircle size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {nf.status === 'erro' && (
                                                                    <button 
                                                                        className={styles.nfActionBtn} 
                                                                        onClick={() => alert('Verifique os erros no retorno da SEFAZ.')}
                                                                        title="Ver Erro"
                                                                    >
                                                                        ⚠️
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getFilteredNFs().length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                                                            Nenhuma nota fiscal encontrada com estes filtros.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div >
                )
                }

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
            </div>
        </PlanGuard>
    )
}
