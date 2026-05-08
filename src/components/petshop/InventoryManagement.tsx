'use client'

import { useState, useMemo } from 'react'
import { Product, ProductFormData } from '@/types/database'
import styles from './InventoryManagement.module.css'
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, DollarSign, X } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import DateInput from '@/components/ui/DateInput'
import { createClient } from '@/lib/supabase/client'

interface InventoryManagementProps {
    products: Product[]
    onUpdate: () => Promise<void>
}

export default function InventoryManagement({ products, onUpdate }: InventoryManagementProps) {
    const supabase = createClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState<ProductFormData>({
        name: '', category: 'Alimentação', cost_price: 0, selling_price: 0,
        stock_quantity: 0, expiration_date: '', bar_code: '', description: '',
        codigo_ncm: '', cfop: '5102', icms_situacao_tributaria: '102'
    })

    const categories = ['Todas', 'Alimentação', 'Higiene', 'Brinquedos', 'Farmácia', 'Acessórios']

    // Dashboard metrics
    const metrics = useMemo(() => {
        const active = products.length
        const lowStock = products.filter(p => p.stock_quantity <= 5).length
        const totalValue = products.reduce((acc, p) => acc + ((p.cost_price || 0) * p.stock_quantity), 0)
        
        return { active, lowStock, totalValue }
    }, [products])

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.bar_code?.includes(searchTerm)
        const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const handleOpenModal = (product?: Product) => {
        if (product) {
            const p = product as any
            const fiscal = Array.isArray(p.produtos_fiscal) ? p.produtos_fiscal[0] : p.produtos_fiscal
            
            setEditingProduct(product)
            setFormData({
                name: product.name,
                category: product.category,
                cost_price: product.cost_price || 0,
                selling_price: product.price,
                stock_quantity: product.stock_quantity,
                expiration_date: product.expiration_date || '',
                bar_code: product.bar_code || '',
                description: product.description || '',
                image_url: product.image_url,
                codigo_ncm: fiscal?.codigo_ncm || '',
                cfop: fiscal?.cfop || '5102',
                icms_situacao_tributaria: fiscal?.icms_situacao_tributaria || '102'
            })
        } else {
            setEditingProduct(null)
            setFormData({
                name: '', category: 'Alimentação', cost_price: 0, selling_price: 0,
                stock_quantity: 0, expiration_date: '', bar_code: '', description: '', image_url: null,
                codigo_ncm: '', cfop: '5102', icms_situacao_tributaria: '102'
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            const productData = {
                org_id: profile.org_id,
                name: formData.name,
                category: formData.category,
                cost_price: formData.cost_price || 0,
                price: formData.selling_price || 0,
                stock_quantity: formData.stock_quantity || 0,
                expiration_date: formData.expiration_date || null,
                description: formData.description || '',
                image_url: formData.image_url,
                bar_code: formData.bar_code || '',
                is_active: true
            }

            let productId = editingProduct?.id

            if (editingProduct) {
                const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from('products').insert(productData).select('id').single()
                if (error) throw error
                productId = data.id
            }

            if (productId) {
                await supabase.from('produtos_fiscal').upsert({
                    produto_id: productId,
                    codigo_ncm: formData.codigo_ncm?.replace(/\D/g, '') || '00000000',
                    cfop: formData.cfop || '5102',
                    icms_situacao_tributaria: formData.icms_situacao_tributaria || '102',
                    unidade_comercial: 'un'
                }, { onConflict: 'produto_id' })
            }

            await onUpdate()
            setIsModalOpen(false)
        } catch (error) {
            console.error('Erro ao salvar produto:', error)
            alert('Erro ao salvar produto.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return
        try {
            const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
            if (error) throw error
            await onUpdate()
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Erro ao excluir produto.')
        }
    }

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div className={styles.container}>
            {/* Dashboard */}
            <div className={styles.dashboard}>
                <div className={styles.card}>
                    <div className={styles.cardTitle}><Package size={16} /> Produtos Ativos</div>
                    <div className={styles.cardValue}>{metrics.active}</div>
                </div>
                <div className={`${styles.card} ${styles.warning}`}>
                    <div className={styles.cardTitle}><AlertTriangle size={16} /> Estoque Baixo</div>
                    <div className={styles.cardValue}>{metrics.lowStock}</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTitle}><DollarSign size={16} /> Valor em Estoque</div>
                    <div className={styles.cardValue}>{formatCurrency(metrics.totalValue)}</div>
                </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar produto por nome ou código..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <select 
                        className={styles.select}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className={styles.addButton} onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Categoria</th>
                            <th>Custo</th>
                            <th>Venda</th>
                            <th>Estoque</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div className={styles.productCell}>
                                        {p.image_url ? 
                                            <img src={p.image_url} alt="" className={styles.productImg} /> : 
                                            <div className={styles.productImg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                                        }
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>{p.name}</span>
                                            <span className={styles.productCode}>{p.bar_code || 'Sem código'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`${styles.badge} ${styles.badgeUnit}`}>{p.category}</span></td>
                                <td>{formatCurrency(p.cost_price || 0)}</td>
                                <td><strong>{formatCurrency(p.price)}</strong></td>
                                <td>
                                    <span className={`
                                        ${styles.badge} 
                                        ${p.stock_quantity <= 0 ? styles.outOfStock : 
                                          p.stock_quantity <= 5 ? styles.lowStock : styles.badgeStock}
                                    `}>
                                        {p.stock_quantity} un
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button className={styles.actionBtn} onClick={() => handleOpenModal(p)}><Edit2 size={14} /></button>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.actionBtn} style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={() => setIsModalOpen(false)}>
                            <X size={18} />
                        </button>
                        <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                        <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
                            <div className={styles.formGrid}>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ alignItems: 'center' }}>
                                    <ImageUpload 
                                        bucket="products" 
                                        url={formData.image_url} 
                                        onUpload={v => setFormData(p => ({ ...p, image_url: v }))} 
                                        onRemove={() => setFormData(p => ({ ...p, image_url: null }))} 
                                        label="Foto do Produto" 
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label className={styles.label}>Nome do Produto</label>
                                    <input className={styles.input} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Preço de Custo (R$)</label>
                                    <input className={styles.input} type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Preço de Venda (R$)</label>
                                    <input className={styles.input} type="number" step="0.01" required value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value)})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Estoque Atual</label>
                                    <input className={styles.input} type="number" required value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value)})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Categoria</label>
                                    <select className={styles.selectField} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>NCM</label>
                                    <input className={styles.input} placeholder="0000.00.00" value={formData.codigo_ncm} onChange={e => setFormData({...formData, codigo_ncm: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>CFOP</label>
                                    <input className={styles.input} placeholder="5102" value={formData.cfop} onChange={e => setFormData({...formData, cfop: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>CSOSN / CST</label>
                                    <input className={styles.input} placeholder="102" value={formData.icms_situacao_tributaria} onChange={e => setFormData({...formData, icms_situacao_tributaria: e.target.value})} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Código de Barras</label>
                                    <input className={styles.input} value={formData.bar_code} onChange={e => setFormData({...formData, bar_code: e.target.value})} />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label className={styles.label}>Descrição</label>
                                    <textarea className={styles.input} rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                            </div>
                            <div className={styles.footer}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                                    {isSaving ? 'Salvando...' : 'Salvar Produto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
