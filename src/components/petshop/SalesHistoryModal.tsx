'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPetshopOrders } from '@/app/actions/petshop'
import { Search, Calendar, User, ShoppingBag, X, FileText, Send, RefreshCw, Eye } from 'lucide-react'
import EmitirNFModal from '@/components/EmitirNFModal'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, FileDown } from 'lucide-react'

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

    const exportCSV = () => {
        if (orders.length === 0) return
        
        const headers = ['Data', 'Cliente', 'Pet', 'Total', 'Metodo Pagamento', 'Status Pagamento', 'Itens']
        const rows = orders.map(order => [
            format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
            order.customers?.name || 'Venda Avulsa',
            order.pets?.name || '-',
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

    const exportPDF = () => {
        if (orders.length === 0) return
        
        const doc = new jsPDF()
        doc.text('Extrato de Vendas - Petshop', 14, 15)
        doc.setFontSize(10)
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22)
        
        const tableData = orders.map(order => [
            format(new Date(order.created_at), 'dd/MM/yy HH:mm'),
            order.customers?.name || 'Venda Avulsa',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount),
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
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>Histórico detalhado do PDV</p>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', 
                        padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' 
                    }}>
                        <X size={20} />
                    </button>
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
                    ) : orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhuma venda encontrada no período.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {orders.map(order => (
                                <div key={order.id} style={{
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
                                                    {order.customers?.name || 'Venda Avulsa'}
                                                </div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {order.pets?.name && <span style={{ color: '#60a5fa' }}>🐾 {order.pets.name}</span>}
                                                    <span>• {format(new Date(order.created_at), 'dd/MM/yy HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                {order.payment_method?.toUpperCase()} • {order.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Summary */}
                                    <div style={{ 
                                        padding: '0.75rem', borderRadius: '8px', 
                                        background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem', color: '#cbd5e1' 
                                    }}>
                                        {order.order_items?.map((item: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: idx === order.order_items.length - 1 ? 0 : '0.25rem' }}>
                                                <span>{item.quantity}x {item.product_name}</span>
                                                <span style={{ color: '#94a3b8' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* NF Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {nfeStatusBadge(order.nf?.status)}
                                            {order.nf?.status === 'autorizado' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <a 
                                                        href={order.nf.caminho_pdf.startsWith('http') ? order.nf.caminho_pdf : `https://api.focusnfe.com.br${order.nf.caminho_pdf}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                                                            fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'none',
                                                            background: 'rgba(96, 165, 250, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px'
                                                        }}
                                                    >
                                                        <Eye size={14} /> PDF
                                                    </a>
                                                    <button 
                                                        onClick={() => handleSendWhatsApp(order.nf.referencia)}
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
                                        </div>

                                        {(!order.nf || order.nf.status === 'erro') && order.payment_status === 'paid' && (
                                            <button 
                                                onClick={() => {
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
                                                                // We'll skip cep/uf here as we fixed the builder fallback
                                                            }
                                                        } : undefined,
                                                        produtos: order.order_items.map((it: any) => ({
                                                            id: it.product_id,
                                                            descricao: it.product_name,
                                                            quantidade: it.quantity,
                                                            total_price: it.total_price,
                                                            valor_unitario: it.unit_price,
                                                            discount_percent: it.discount_percent,
                                                            ncm: it.product?.codigo_ncm || '00000000',
                                                            cfop: it.product?.cfop || '5102',
                                                            unidade: it.product?.unidade_comercial || 'un'
                                                        }))
                                                    })
                                                    setShowNFModal(true)
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    background: '#3b82f6', color: '#fff', border: 'none',
                                                    padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                                    fontSize: '0.85rem', fontWeight: 600
                                                }}
                                            >
                                                <FileText size={16} /> {order.nf?.status === 'erro' ? 'Tentar Novamente' : 'Emitir Nota Fiscal'}
                                            </button>
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
                    tipo="nfe"
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
