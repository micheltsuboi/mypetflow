'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, User, ShoppingBag, X, FileText, Send, RefreshCw, Eye, Trash2 } from 'lucide-react'
import { getPetshopOrders, deletePetshopOrder } from '@/app/actions/petshop'
import EmitirNFModal from '@/components/EmitirNFModal'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, FileDown, FileCode, AlertTriangle } from 'lucide-react'

interface SalesHistoryModalProps {
    onClose: () => void
}

export default function SalesHistoryModal({ onClose }: SalesHistoryModalProps) {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    
    // NF Handling
    const [showNFModal, setShowNFModal] = useState(false)
    const [nfType, setNfType] = useState<'nfe' | 'nfce'>('nfe')
    const [selectedOrderForNF, setSelectedOrderForNF] = useState<any>(null)

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        const res = await getPetshopOrders({
            startDate,
            endDate,
            searchTerm
        })
        if (res.success) {
            setOrders(res.data || [])
        }
        setLoading(false)
    }, [startDate, endDate, searchTerm])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    const handleSendWhatsApp = async (referencia: string) => {
        try {
            const res = await fetch('/api/nf/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referencia })
            })
            const data = await res.json()
            if (res.ok) {
                alert('✅ NF enviada com sucesso para o WhatsApp!')
            } else {
                alert('❌ Erro ao enviar: ' + data.error)
            }
        } catch (error) {
            console.error(error)
            alert('❌ Erro de conexão ao tentar enviar WhatsApp.')
        }
    }

    const handleSync = async (nota: any) => {
        try {
            const res = await fetch(`/api/nf/sync?ref=${nota.referencia}&org_id=${nota.org_id}`)
            if (!res.ok) throw new Error('Erro ao sincronizar')
            fetchOrders() // Recarregar dados após sincronizar
        } catch (error: any) {
            alert(error.message)
        }
    }

    const exportCSV = () => {
        if (orders.length === 0) return
        
        const headers = ['Data', 'Cliente', 'Pet', 'Total', 'Metodo Pagamento', 'Status Pagamento', 'Itens']
        const rows = orders.map(order => [
            safeFormatDate(order.created_at, 'dd/MM/yyyy HH:mm'),
            (Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name) || 'Venda Avulsa',
            (Array.isArray(order.pets) ? order.pets[0]?.name : order.pets?.name) || '-',
            order.total_amount,
            order.payment_method,
            order.payment_status,
            order.order_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join('; ')
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `extrato_petshop_${format(new Date(), 'dd_MM_yyyy')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('🚨 ATENÇÃO: Deseja excluir esta venda? \n\nIsso irá remover os itens do extrato e também EXCLUIR a transação financeira vinculada. Esta ação não pode ser desfeita.')) return
        
        setLoading(true)
        try {
            const res = await deletePetshopOrder(orderId)
            if (res.success) {
                fetchOrders()
            } else {
                alert(res.message)
                setLoading(false)
            }
        } catch (error) {
            console.error('Error deleting order:', error)
            alert('Erro ao tentar excluir venda.')
            setLoading(false)
        }
    }

    const exportPDF = () => {
        if (orders.length === 0) return
        
        const doc = new jsPDF()
        doc.text('Extrato de Vendas - Petshop', 14, 15)
        doc.setFontSize(10)
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22)
        
        const tableData = orders.map(order => [
            safeFormatDate(order.created_at, 'dd/MM/yy HH:mm'),
            (Array.isArray(order.customers) ? order.customers[0]?.name : order.customers?.name) || 'Venda Avulsa',
            safeFormatCurrency(order.total_amount),
            order.payment_method?.toUpperCase() || '-',
            order.order_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ')
        ])

        autoTable(doc, {
            head: [['Data', 'Cliente', 'Total', 'Pagamento', 'Itens']],
            body: tableData,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] },
            styles: { fontSize: 8 }
        })

        doc.save(`extrato_petshop_${format(new Date(), 'dd_MM_yyyy')}.pdf`)
    }

    const nfeStatusBadge = (status: string) => {
        const colors = {
            'autorizado': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
            'erro': { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
            'processando': { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
            'cancelado': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748B' }
        }
        const config = colors[status as keyof typeof colors] || { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748B' }
        
        return (
            <span style={{ 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 600,
                backgroundColor: config.bg,
                color: config.text,
                textTransform: 'uppercase'
            }}>
                {status || 'Sem Nota'}
            </span>
        )
    }

    const safeFormatDate = (dateStr: string, formatStr: string) => {
        try {
            if (!dateStr) return '-'
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return '-'
            return format(d, formatStr)
        } catch (e) {
            return '-'
        }
    }

    const safeFormatCurrency = (value: number) => {
        try {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
        } catch (e) {
            return 'R$ 0,00'
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: '#0f172a',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '1.5rem', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShoppingBag size={24} color="#60a5fa" /> Extrato de Vendas
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>Gerencie suas vendas e registros financeiros</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            type="button"
                            onClick={() => {
                                try {
                                    fetchOrders();
                                } catch (e) {
                                    console.error("Error refreshing orders:", e);
                                }
                            }} 
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#60a5fa', 
                                padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' 
                            }}
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            type="button"
                            onClick={onClose} 
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', 
                                padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' 
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente ou produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Calendar size={16} color="#64748b" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem', color: '#fff' }}
                        />
                        <span style={{ color: '#64748b' }}>até</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem', color: '#fff' }}
                        />
                    </div>
                </div>

                {/* Orders List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando vendas...</div>
                    ) : (orders || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhuma venda encontrada no período.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {orders.map((order, orderIdx) => (
                                <div key={order?.id || orderIdx} style={{
                                    background: '#1e293b',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ 
                                                width: '40px', height: '40px', borderRadius: '10px', 
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                            }}>
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>
                                                    {order?.customers?.name || 'Venda Avulsa'}
                                                </div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {order?.pets?.name && (
                                                        <span style={{ color: '#60a5fa' }}>🐾 {order.pets.name}</span>
                                                    )}
                                                    <span>• {safeFormatDate(order?.created_at, 'dd/MM/yy HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                                                {safeFormatCurrency(order?.total_amount)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                {order?.payment_method?.toUpperCase() || '-'} • {order?.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                                            </div>
                                            <button 
                                                onClick={() => order?.id && handleDeleteOrder(order.id)}
                                                style={{
                                                    marginTop: '0.5rem',
                                                    background: 'transparent', border: 'none', color: '#ef4444',
                                                    cursor: 'pointer', padding: '0.25rem', opacity: 0.6
                                                }}
                                                title="Excluir Venda"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Items Summary */}
                                    <div style={{ 
                                        padding: '0.75rem', borderRadius: '8px', 
                                        background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem', color: '#cbd5e1' 
                                    }}>
                                        {(order?.order_items || []).map((item: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: (order?.order_items && idx === order.order_items.length - 1) ? 0 : '0.25rem' }}>
                                                <span>{item?.quantity || 0}x {item?.product_name || 'Produto'}</span>
                                                <span style={{ color: '#94a3b8' }}>{safeFormatCurrency(item?.total_price)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* NF Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {nfeStatusBadge(order?.nf?.status)}
                                            {order?.nf?.status === 'autorizado' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <a 
                                                        href={`/api/nf/download?ref=${order.nf.referencia}&org_id=${order.org_id}&type=pdf`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                            fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none',
                                                            background: 'rgba(96, 165, 250, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                        }}
                                                    >
                                                        <FileText size={14} /> PDF
                                                    </a>
                                                    <a 
                                                        href={`/api/nf/download?ref=${order.nf.referencia}&org_id=${order.org_id}&type=xml`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                            fontSize: '0.75rem', color: '#a78bfa', textDecoration: 'none',
                                                            background: 'rgba(167, 139, 250, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                        }}
                                                    >
                                                        <FileCode size={14} /> XML
                                                    </a>
                                                    <button 
                                                        onClick={() => order?.nf?.referencia && handleSendWhatsApp(order.nf.referencia)}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                            fontSize: '0.75rem', color: '#2ecc71', border: 'none', cursor: 'pointer',
                                                            background: 'rgba(46, 204, 113, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                        }}
                                                    >
                                                        <Send size={14} /> WhatsApp
                                                    </button>
                                                </div>
                                            )}
                                            {order?.nf && (order.nf.status === 'processando' || order.nf.status === 'erro') && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        onClick={() => handleSync(order.nf)}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                            fontSize: '0.75rem', color: '#fbbf24', border: 'none', cursor: 'pointer',
                                                            background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                        }}
                                                        title="Sincronizar com SEFAZ"
                                                    >
                                                        <RefreshCw size={14} /> Sincronizar
                                                    </button>
                                                    {order.nf.status === 'erro' && (
                                                        <button 
                                                            onClick={() => alert(order.nf.mensagem_sefaz || 'Erro não detalhado')}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                                fontSize: '0.75rem', color: '#ef4444', border: 'none', cursor: 'pointer',
                                                                background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                            }}
                                                            title="Ver Motivo do Erro"
                                                        >
                                                            <AlertTriangle size={14} /> Ver Erro
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {(!order?.nf || order.nf.status === 'erro') && order?.payment_status === 'paid' && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    onClick={() => {
                                                        if (!order) return;
                                                        setSelectedOrderForNF({
                                                            orderId: order.id,
                                                            total_amount: order.total_amount,
                                                            tutor: order.customers ? {
                                                                nome: order.customers.name,
                                                                cpf: order.customers.cpf_cnpj || order.customers.cpf,
                                                                email: order.customers.email,
                                                                endereco: {
                                                                    logradouro: order.customers.address,
                                                                    bairro: order.customers.neighborhood,
                                                                    city: order.customers.city,
                                                                }
                                                            } : undefined,
                                                            produtos: (order.order_items || []).map((it: any) => {
                                                                const fiscal = it?.products?.produtos_fiscal?.[0] || {}
                                                                return {
                                                                    id: it?.product_id,
                                                                    descricao: it?.product_name || 'Produto',
                                                                    quantidade: it?.quantity || 0,
                                                                    total_price: it?.total_price || 0,
                                                                    valor_unitario: it?.unit_price || 0,
                                                                    discount_percent: it?.discount_percent || 0,
                                                                    ncm: fiscal.codigo_ncm || '00000000',
                                                                    cfop: fiscal.cfop || '5102',
                                                                    cst: fiscal.icms_situacao_tributaria || '102',
                                                                    unidade: fiscal.unidade_comercial || 'un'
                                                                }
                                                            })
                                                        })
                                                        setNfType('nfe')
                                                        setShowNFModal(true)
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                        background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)',
                                                        padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                                                        fontSize: '0.8rem', fontWeight: 600
                                                    }}
                                                >
                                                    <FileText size={14} /> {order.nf?.status === 'erro' ? 'Tentar NFe' : 'Emitir NF-e'}
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        if (!order) return;
                                                        setSelectedOrderForNF({
                                                            orderId: order.id,
                                                            total_amount: order.total_amount,
                                                            tutor: order.customers ? {
                                                                nome: order.customers.name,
                                                                cpf: order.customers.cpf_cnpj || order.customers.cpf,
                                                                email: order.customers.email,
                                                                endereco: {
                                                                    logradouro: order.customers.address,
                                                                    bairro: order.customers.neighborhood,
                                                                    city: order.customers.city,
                                                                }
                                                            } : undefined,
                                                            produtos: (order.order_items || []).map((it: any) => {
                                                                const fiscal = it?.products?.produtos_fiscal?.[0] || {}
                                                                return {
                                                                    id: it?.product_id,
                                                                    descricao: it?.product_name || 'Produto',
                                                                    quantidade: it?.quantity || 0,
                                                                    total_price: it?.total_price || 0,
                                                                    valor_unitario: it?.unit_price || 0,
                                                                    discount_percent: it?.discount_percent || 0,
                                                                    ncm: fiscal.codigo_ncm || '00000000',
                                                                    cfop: fiscal.cfop || '5102',
                                                                    cst: fiscal.icms_situacao_tributaria || '102',
                                                                    unidade: fiscal.unidade_comercial || 'un'
                                                                }
                                                            })
                                                        })
                                                        setNfType('nfce')
                                                        setShowNFModal(true)
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                        background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                                                        fontSize: '0.8rem', fontWeight: 600
                                                    }}
                                                >
                                                    <FileText size={14} /> {order.nf?.status === 'erro' ? 'Tentar Cupom' : 'Emitir Cupom'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Stats */}
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Mostrando <strong>{orders.length}</strong> vendas recentes
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={exportCSV}
                            disabled={orders.length === 0}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', 
                                padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' 
                            }}
                        >
                            <Download size={14} /> CSV
                        </button>
                        <button 
                            onClick={exportPDF}
                            disabled={orders.length === 0}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', 
                                padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' 
                            }}
                        >
                            <FileDown size={14} /> PDF
                        </button>
                        <button 
                            onClick={fetchOrders}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                background: 'transparent', border: 'none', color: '#60a5fa', 
                                cursor: 'pointer', fontSize: '0.85rem', marginLeft: '0.5rem'
                            }}
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
                        </button>
                    </div>
                </div>
            </div>

            {showNFModal && selectedOrderForNF && (
                <EmitirNFModal 
                    tipo={nfType}
                    origemTipo="pdv"
                    refId={selectedOrderForNF.orderId}
                    total_amount={selectedOrderForNF.total_amount}
                    tutor={selectedOrderForNF.tutor}
                    produtos={selectedOrderForNF.produtos}
                    onClose={() => setShowNFModal(false)}
                    onSuccess={() => {
                        setShowNFModal(false)
                        fetchOrders()
                    }}
                />
            )}
        </div>
    )
}
