'use client'

import { useState, useEffect, useCallback } from 'react'
import { Product, ProductFormData } from '@/types/database'
import ImageUpload from '@/components/ImageUpload'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'

export default function PetshopPage() {
    const supabase = createClient()
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [viewProduct, setViewProduct] = useState<Product | null>(null)
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
    const [saleData, setSaleData] = useState({
        quantity: 1,
        tempDiscountPercent: 0,
        paymentMethod: 'cash'
    })
    const [productToSell, setProductToSell] = useState<Product | null>(null)

    // Form State
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        category: 'Alimentação',
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        expiration_date: '',
        bar_code: '',
        description: ''
    })

    const categories = ['Todas', 'Alimentação', 'Higiene', 'Brinquedos', 'Farmácia', 'Acessórios']

    const fetchProducts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name')

            if (error) throw error
            if (data) setProducts(data)
        } catch (error) {
            console.error('Erro ao buscar produtos:', error)
            alert('Erro ao carregar produtos. Tente novamente.')
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const handleOpenModal = (product?: Product) => {
        if (product) {
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
                image_url: product.image_url
            })
        } else {
            setEditingProduct(null)
            setFormData({
                name: '',
                category: 'Alimentação',
                cost_price: 0,
                selling_price: 0,
                stock_quantity: 0,
                expiration_date: '',
                bar_code: '',
                description: '',
                image_url: null
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get user's organization
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) {
                alert('Erro: Organização não encontrada.')
                return
            }

            const productData = {
                org_id: profile.org_id,
                name: formData.name,
                category: formData.category,
                cost_price: formData.cost_price || 0,
                price: formData.selling_price || 0,
                stock_quantity: formData.stock_quantity || 0,
                min_stock_alert: 5,
                expiration_date: formData.expiration_date || null,
                description: formData.description,
                image_url: formData.image_url,
                bar_code: formData.bar_code,
                is_active: true
            }

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert(productData)

                if (error) throw error
            }

            await fetchProducts()
            setIsModalOpen(false)
        } catch (error) {
            console.error('Erro ao salvar produto:', error)
            alert('Erro ao salvar produto. Verifique os dados e tente novamente.')
        }
    }

    const handleOpenSaleModal = (product: Product) => {
        setProductToSell(product)
        setSaleData({ quantity: 1, tempDiscountPercent: 0, paymentMethod: 'cash' })
        setIsSaleModalOpen(true)
    }

    const handleConfirmSale = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!productToSell) return

        try {
            const discountAmount = (productToSell.price * saleData.quantity) * (saleData.tempDiscountPercent / 100)
            const finalTotal = (productToSell.price * saleData.quantity) - discountAmount

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get user's organization
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            // 1. Update Stock
            const { error: stockError } = await supabase
                .from('products')
                .update({ stock_quantity: productToSell.stock_quantity - saleData.quantity })
                .eq('id', productToSell.id)

            if (stockError) throw stockError

            // 2. Create Financial Transaction
            const { error: transactionError } = await supabase
                .from('financial_transactions')
                .insert({
                    org_id: profile.org_id,
                    type: 'income',
                    category: 'Venda Produto',
                    amount: finalTotal,
                    description: `Venda de ${saleData.quantity}x ${productToSell.name}`,
                    payment_method: saleData.paymentMethod || 'cash',
                    created_by: user.id,
                    date: new Date().toISOString()
                })

            if (transactionError) {
                console.error('Erro ao registrar transação:', transactionError)
                alert('Venda realizada, mas houve um erro ao registrar no financeiro.')
            } else {
                alert(`Venda realizada com sucesso!\n\nTotal: ${formatCurrency(finalTotal)}\nEstoque atualizado e transação registrada.`)
            }

            await fetchProducts()
            setIsSaleModalOpen(false)
            setProductToSell(null)

        } catch (error) {
            console.error('Erro ao processar venda:', error)
            alert('Erro ao processar a venda. Tente novamente.')
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id)

                if (error) throw error

                setProducts(products.filter(p => p.id !== id))
                alert('Produto excluído com sucesso!')
            } catch (error) {
                console.error('Erro ao excluir produto:', error)
                alert('Erro ao excluir produto.')
            }
        }
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'Todas' || product.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    if (isLoading) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Carregando produtos...</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>📦 Gestão de Produtos</h1>
                    <p className={styles.subtitle}>Gerencie o estoque e catálogo do Pet Shop</p>
                </div>
                <button className={styles.addButton} onClick={() => handleOpenModal()}>
                    ➕ Novo Produto
                </button>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className={styles.searchIcon}>🔍</span>
                </div>
                <select
                    className={styles.categoryFilter}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>Foto</th>
                            <th>Produto</th>
                            <th>Categoria</th>
                            <th>Preço</th>
                            <th>Estoque</th>
                            <th>Validade</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id} onClick={() => setViewProduct(product)} style={{ cursor: 'pointer' }}>
                                <td>
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className={styles.productThumb} />
                                    ) : (
                                        <div className={styles.productThumb}>📦</div>
                                    )}
                                </td>
                                <td>
                                    <div className={styles.productNameCell}>
                                        {product.name}
                                    </div>
                                </td>
                                <td><span className={styles.productCategoryCell}>{product.category}</span></td>
                                <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(product.price)}</td>
                                <td>
                                    <span className={`${styles.stockValue} ${product.stock_quantity < (product.min_stock_alert || 5) ? styles.lowStock : ''}`}>
                                        {product.stock_quantity} un
                                    </span>
                                </td>
                                <td>{formatDate(product.expiration_date)}</td>
                                <td>
                                    <div className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                                        <button className={styles.tableActionBtn} title="Ver Detalhes" onClick={() => setViewProduct(product)}>
                                            👁️
                                        </button>
                                        <button className={styles.tableActionBtn} title="Vender" style={{ color: '#10B981', borderColor: '#10B981' }} onClick={() => handleOpenSaleModal(product)}>
                                            💲
                                        </button>
                                        <button className={styles.tableActionBtn} title="Editar" onClick={() => handleOpenModal(product)}>
                                            ✏️
                                        </button>
                                        <button className={styles.tableActionBtn} title="Excluir" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDelete(product.id)}>
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    Nenhum produto encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>×</button>
                        <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>

                        <form onSubmit={handleSave}>
                            <div className={styles.formGroup} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                <ImageUpload
                                    bucket="products"
                                    url={formData.image_url}
                                    onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                    onRemove={() => setFormData(prev => ({ ...prev, image_url: null }))}
                                    label="Foto do Produto"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nome do Produto</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Categoria</label>
                                    <select
                                        className={styles.select}
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.filter(c => c !== 'Todas').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Validade</label>
                                    <input
                                        className={styles.input}
                                        type="date"
                                        value={formData.expiration_date}
                                        onChange={e => setFormData({ ...formData, expiration_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Preço de Custo (R$)</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={formData.cost_price}
                                        onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Preço de Venda (R$)</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={formData.selling_price}
                                        onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Quantidade em Estoque</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.stock_quantity}
                                        onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Código de Barras</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={formData.bar_code}
                                        onChange={e => setFormData({ ...formData, bar_code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Descrição</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <button type="submit" className={styles.submitButton}>
                                Salvar Produto
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isSaleModalOpen && productToSell && (
                <div className={styles.modalOverlay} onClick={() => setIsSaleModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setIsSaleModalOpen(false)}>×</button>
                        <h2><span className={styles.modalIcon}>$</span> Registrar Venda</h2>
                        <p className={styles.subtitle}>{productToSell.name}</p>

                        <form onSubmit={handleConfirmSale} className={styles.saleForm}>
                            <div className={styles.saleInfo}>
                                <div className={styles.infoRow}>
                                    <span>Preço Unitário:</span>
                                    <strong>{formatCurrency(productToSell.price)}</strong>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>Em Estoque:</span>
                                    <strong>{productToSell.stock_quantity} un</strong>
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Quantidade</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min="1"
                                        max={productToSell.stock_quantity}
                                        required
                                        value={saleData.quantity}
                                        onChange={e => setSaleData({ ...saleData, quantity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Desconto (%)</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={saleData.tempDiscountPercent}
                                        onChange={e => setSaleData({ ...saleData, tempDiscountPercent: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Forma de Pagamento</label>
                                    <select
                                        className={styles.select}
                                        value={saleData.paymentMethod}
                                        onChange={e => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                                    >
                                        <option value="cash">Dinheiro</option>
                                        <option value="credit">Cartão de Crédito</option>
                                        <option value="debit">Cartão de Débito</option>
                                        <option value="pix">PIX</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.totalSection}>
                                <div className={styles.totalRow}>
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(productToSell.price * saleData.quantity)}</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>Desconto:</span>
                                    <span className={styles.discountValue}>
                                        - {formatCurrency((productToSell.price * saleData.quantity) * (saleData.tempDiscountPercent / 100))}
                                    </span>
                                </div>
                                <div className={`${styles.totalRow} ${styles.finalTotal}`}>
                                    <span>Total Final:</span>
                                    <span>
                                        {formatCurrency(
                                            (productToSell.price * saleData.quantity) -
                                            ((productToSell.price * saleData.quantity) * (saleData.tempDiscountPercent / 100))
                                        )}
                                    </span>
                                </div>
                            </div>

                            <button type="submit" className={`${styles.submitButton} ${styles.confirmSaleButton}`}>
                                Confirmar Venda
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {viewProduct && (
                <div className={styles.modalOverlay} onClick={() => setViewProduct(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setViewProduct(null)}>×</button>
                        <h2>Detalhes do Produto</h2>

                        <div className={styles.detailImageContainer}>
                            {viewProduct.image_url ? (
                                <img src={viewProduct.image_url} alt={viewProduct.name} className={styles.detailImage} />
                            ) : (
                                <div style={{ fontSize: '4rem' }}>📦</div>
                            )}
                        </div>

                        <div className={styles.detailInfo}>
                            <div>
                                <span className={styles.detailLabel}>Nome do Produto</span>
                                <div className={styles.detailValue}>{viewProduct.name}</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Categoria</span>
                                <div className={styles.detailValue}>{viewProduct.category}</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Preço de Venda</span>
                                <div className={styles.detailValue} style={{ color: 'var(--primary)' }}>{formatCurrency(viewProduct.price)}</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Preço de Custo</span>
                                <div className={styles.detailValue} style={{ fontSize: '0.9rem' }}>{formatCurrency(viewProduct.cost_price || 0)}</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Estoque Atual</span>
                                <div className={styles.detailValue}>{viewProduct.stock_quantity} unidades</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Código de Barras</span>
                                <div className={styles.detailValue}>{viewProduct.bar_code || '-'}</div>
                            </div>
                            <div>
                                <span className={styles.detailLabel}>Validade</span>
                                <div className={styles.detailValue}>{formatDate(viewProduct.expiration_date)}</div>
                            </div>
                        </div>

                        {viewProduct.description && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <span className={styles.detailLabel}>Descrição</span>
                                <div className={styles.detailDescription}>
                                    {viewProduct.description}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                className={styles.submitButton}
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                onClick={() => { setViewProduct(null); handleOpenModal(viewProduct) }}
                            >
                                ✏️ Editar
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={() => { setViewProduct(null); handleOpenSaleModal(viewProduct) }}
                            >
                                💲 Vender
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
