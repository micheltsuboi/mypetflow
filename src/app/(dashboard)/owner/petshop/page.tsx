'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Product, ProductFormData } from '@/types/database'
import ImageUpload from '@/components/ImageUpload'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import PlanGuard from '@/components/modules/PlanGuard'
import { searchTutorsForPDV, checkoutCart } from '@/app/actions/petshop'
import { getCashbackBalance } from '@/app/actions/cashback'
import { ShoppingCart, Plus, Minus, Trash2, Search, PackageOpen, Coins } from 'lucide-react'
import DateInput from '@/components/ui/DateInput'
import EmitirNFModal from '@/components/EmitirNFModal'

// Interfaces locais para o Carrinho
interface CartItem {
    id: string
    product_id: string
    name: string
    quantity: number
    unit_price: number
    discount_percent: number
    total_price: number
    stock_quantity: number
    image_url: string | null
}

interface TutorSearchResult {
    id: string
    name: string
    cpf: string | null
    pets: { id: string, name: string, species: string }[]
}

export default function PetshopPage() {
    const supabase = createClient()
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')

    // Gerenciador de Produtos (CRUD Modal)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [formData, setFormData] = useState<ProductFormData>({
        name: '', category: 'Alimentação', cost_price: 0, selling_price: 0,
        stock_quantity: 0, expiration_date: '', bar_code: '', description: ''
    })

    // Carrinho de Compras (PDV)
    const [cart, setCart] = useState<CartItem[]>([])
    const [globalDiscount, setGlobalDiscount] = useState<number>(0)
    const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'fixed'>('percent')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid')

    // Vinculação Cliente/Pet
    const [tutorQuery, setTutorQuery] = useState('')
    const [tutorResults, setTutorResults] = useState<TutorSearchResult[]>([])
    const [isSearchingTutors, setIsSearchingTutors] = useState(false)
    const [selectedTutor, setSelectedTutor] = useState<TutorSearchResult | null>(null)
    const [selectedPetId, setSelectedPetId] = useState<string>('')
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    // Cashback Logic
    const [cashbackBalance, setCashbackBalance] = useState(0)
    const [useCashbackAmount, setUseCashbackAmount] = useState(0)
    const [isUsingCashback, setIsUsingCashback] = useState(false)

    // Emissão NFe
    const [showNFModal, setShowNFModal] = useState(false)
    const [checkoutSaleData, setCheckoutSaleData] = useState<any>(null)

    const categories = ['Todas', 'Alimentação', 'Higiene', 'Brinquedos', 'Farmácia', 'Acessórios']

    // Fetch cashback balance when tutor changes
    useEffect(() => {
        const fetchBalance = async () => {
            if (selectedTutor) {
                const res = await getCashbackBalance(selectedTutor.id)
                if (res.success) {
                    setCashbackBalance(res.balance)
                }
            } else {
                setCashbackBalance(0)
                setIsUsingCashback(false)
                setUseCashbackAmount(0)
            }
        }
        fetchBalance()
    }, [selectedTutor])

    const fetchProducts = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            if (data) setProducts(data)
        } catch (error) {
            console.error('Erro ao buscar produtos:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // Effect para debounce buscar tutores
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (tutorQuery.trim().length >= 2) {
                setIsSearchingTutors(true)
                const res = await searchTutorsForPDV(tutorQuery)
                if (res.success && res.data) {
                    setTutorResults(res.data)
                }
                setIsSearchingTutors(false)
            } else {
                setTutorResults([])
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [tutorQuery])

    // ======== Lógica de Carrinho ========
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock_quantity) {
                    alert(`Estoque máximo atingido para ${product.name} (${product.stock_quantity})`)
                    return prev
                }
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price * (1 - item.discount_percent / 100) }
                        : item
                )
            }
            if (product.stock_quantity <= 0) {
                alert('Produto sem estoque!')
                return prev
            }
            return [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                name: product.name,
                unit_price: product.price,
                quantity: 1,
                discount_percent: 0,
                total_price: product.price,
                stock_quantity: product.stock_quantity,
                image_url: product.image_url
            }]
        })
    }

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.stock_quantity))
                return {
                    ...item,
                    quantity: newQuantity,
                    total_price: newQuantity * item.unit_price * (1 - item.discount_percent / 100)
                }
            }
            return item
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product_id !== productId))
    }

    // Cálculos de Total
    const cartTotals = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)

        let itemDiscounts = cart.reduce((acc, item) => {
            return acc + ((item.unit_price * item.quantity) * (item.discount_percent / 100))
        }, 0)

        const totalBeforeGlobalDiscount = subtotal - itemDiscounts
        const globalDiscountAmount = globalDiscountType === 'percent' 
            ? totalBeforeGlobalDiscount * (globalDiscount / 100)
            : globalDiscount

        let finalTotal = Math.max(0, totalBeforeGlobalDiscount - globalDiscountAmount)
        const totalDiscount = itemDiscounts + globalDiscountAmount

        // Cashback Discount
        if (isUsingCashback) {
            finalTotal = Math.max(0, finalTotal - useCashbackAmount)
        }

        return { subtotal, totalDiscount, finalTotal }
    }, [cart, globalDiscount, globalDiscountType, isUsingCashback, useCashbackAmount])

    const handleCheckout = async () => {
        if (cart.length === 0) return

        setIsCheckingOut(true)
        try {
            const reqData = {
                cartItems: cart,
                customerId: selectedTutor?.id || null,
                petId: selectedPetId || null,
                paymentMethod,
                paymentStatus,
                subtotal: cartTotals.subtotal,
                totalDiscount: cartTotals.totalDiscount,
                finalTotal: cartTotals.finalTotal,
                cashbackUsed: isUsingCashback ? useCashbackAmount : 0
            }

            const res = await checkoutCart(reqData)

            if (res.success) {
                // If user used cashback, we need to register it (this is a simplified logic, 
                // typically checkoutCart would handle this internally in a transaction)
                if (isUsingCashback && selectedTutor && useCashbackAmount > 0) {
                // Logic to deduct from balance would go here or inside checkoutCart
                // For now, we assume checkoutCart handles the finalTotal correctly.
                // We also need to add the logic to accumulate cashback from this order.
            }

            // Mapeia itens para a emissão de nota
            const nfeProducts = cart.map((item, idx) => {
                return {
                    id: item.product_id, // Important to map properly 
                    descricao: item.name,
                    quantidade: item.quantity,
                    valor_unitario: item.unit_price,
                    ncm: '00000000', // You should fetch this from the product/produtos_fiscal or form
                    cfop: '5102', // Venda de mercadoria adquirida de terceiros
                    cst: '102', // CSOSN 102
                    unidade: 'un'
                }
            })

            // Popula dados para NFe
            setCheckoutSaleData({
                orderId: res.orderId || Math.random().toString(), // Handle properly
                total_amount: cartTotals.finalTotal,
                tutor: selectedTutor ? {
                    nome: selectedTutor.name,
                    cpf: selectedTutor.cpf || undefined
                } : undefined,
                produtos: nfeProducts
            })

            alert('Venda finalizada com sucesso!')
            
            // Pergunta se quer emitir NFe ou exibe o modal
            if (res.orderId) {
                setShowNFModal(true)
            }

            // Reset cart and states
            setCart([])
            setSelectedTutor(null)
            setSelectedPetId('')
            setGlobalDiscount(0)
            setTutorQuery('')
            setIsUsingCashback(false)
            setUseCashbackAmount(0)
            fetchProducts() // Update local stock display
        } else {
                alert(res.message || 'Erro ao finalizar venda.')
            }
        } catch (error) {
            console.error('Checkout error:', error)
            alert('Erro ao tentar finalizar a transação.')
        } finally {
            setIsCheckingOut(false)
        }
    }


    // ======== Filtros Visuais de Produto ========
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.bar_code?.includes(searchTerm)
        const matchesCategory = selectedCategory === 'Todas' || product.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    // ======== Gerência de Produtos ========
    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product)
            setFormData({
                name: product.name, category: product.category, cost_price: product.cost_price || 0,
                selling_price: product.price, stock_quantity: product.stock_quantity,
                expiration_date: product.expiration_date || '', bar_code: product.bar_code || '',
                description: product.description || '', image_url: product.image_url
            })
        } else {
            setEditingProduct(null)
            setFormData({
                name: '', category: 'Alimentação', cost_price: 0, selling_price: 0,
                stock_quantity: 0, expiration_date: '', bar_code: '', description: '', image_url: null
            })
        }
        setIsModalOpen(true)
    }

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) return

            const productData = {
                org_id: profile.org_id, name: formData.name, category: formData.category,
                cost_price: formData.cost_price || 0, price: formData.selling_price || 0,
                stock_quantity: formData.stock_quantity || 0, min_stock_alert: 5,
                expiration_date: formData.expiration_date || null, description: formData.description,
                image_url: formData.image_url, bar_code: formData.bar_code, is_active: true
            }

            if (editingProduct) {
                await supabase.from('products').update(productData).eq('id', editingProduct.id)
            } else {
                await supabase.from('products').insert(productData)
            }

            await fetchProducts()
            setIsModalOpen(false)
        } catch (error) {
            console.error('Erro ao salvar produto:', error)
            alert('Erro ao salvar produto.')
        }
    }

    if (isLoading) {
        return <div className={styles.loadingState}>Carregando PDV...</div>
    }

    return (
        <PlanGuard requiredModule="petshop">
            <div className={styles.pdvContainer}>

                {/* LADO ESQUERDO: Catálogo de Produtos */}
                <div className={styles.catalogSection}>
                    <div className={styles.catalogHeader}>
                        <div>
                            <h1 className={styles.title}>🛒 Ponto de Venda</h1>
                            <p className={styles.subtitle}>Selecione os produtos para adicionar ao carrinho</p>
                        </div>
                        <button className={styles.addButton} onClick={() => handleOpenModal()}>
                            + Produto
                        </button>
                    </div>

                    <div className={styles.filters}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Busca por nome ou código de barras..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className={styles.searchIcon} size={18} />
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

                    <div className={styles.productGridWrapper}>
                        {filteredProducts.length === 0 ? (
                            <div className={styles.emptyStateContainer}>
                                <PackageOpen size={48} color="var(--text-secondary)" />
                                <p>Nenhum produto encontrado na busca.</p>
                            </div>
                        ) : (
                            <div className={styles.pdvGrid}>
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className={`${styles.pdvProductCard} ${product.stock_quantity <= 0 ? styles.outOfStock : ''}`}
                                        onClick={() => product.stock_quantity > 0 && addToCart(product)}
                                    >
                                        <div className={styles.pdvImageHero}>
                                            {product.image_url ?
                                                <img src={product.image_url} alt={product.name} /> :
                                                <div className={styles.pdvImagePlaceholder}>📦</div>
                                            }
                                        </div>
                                        <div className={styles.pdvProductInfo}>
                                            <span className={styles.pdvCategory}>{product.category}</span>
                                            <h3 className={styles.pdvName} title={product.name}>{product.name}</h3>
                                            <div className={styles.pdvPriceRow}>
                                                <span className={styles.pdvPrice}>{formatCurrency(product.price)}</span>
                                                <span className={`${styles.pdvStock} ${product.stock_quantity < 5 ? styles.lowStock : ''}`}>
                                                    {product.stock_quantity} un
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* LADO DIREITO: Carrinho de Compras */}
                <div className={styles.cartSection}>
                    <div className={styles.cartHeader}>
                        <ShoppingCart size={24} />
                        <h2>Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</h2>
                    </div>

                    {/* Vínculo de Cliente */}
                    <div className={styles.customerLinkArea}>
                        <label className={styles.cartLabel}>Tutor / Cliente</label>
                        {!selectedTutor ? (
                            <div style={{ position: 'relative' }}>
                                <input
                                    className={styles.cartInput}
                                    placeholder="Venda avulsa. Ou busque o tutor..."
                                    value={tutorQuery}
                                    onChange={e => setTutorQuery(e.target.value)}
                                />
                                {tutorResults.length > 0 && (
                                    <div className={styles.searchResultsDropdown}>
                                        {tutorResults.map(tutor => (
                                            <div
                                                key={tutor.id}
                                                className={styles.searchResultItem}
                                                onClick={() => {
                                                    setSelectedTutor(tutor)
                                                    setTutorResults([])
                                                    setTutorQuery('')
                                                }}
                                            >
                                                <strong>{tutor.name}</strong>
                                                <small>{tutor.cpf ? `CPF: ${tutor.cpf}` : ''}</small>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.selectedCustomerCard}>
                                <div>
                                    <strong>{selectedTutor.name}</strong>
                                </div>
                                <button className={styles.removeLinkedBtn} onClick={() => {
                                    setSelectedTutor(null)
                                    setSelectedPetId('')
                                }}>
                                    ✕ Remover
                                </button>
                            </div>
                        )}

                        {selectedTutor && selectedTutor.pets.length > 0 && (
                            <div style={{ marginTop: '0.75rem' }}>
                                <label className={styles.cartLabel}>Vincular ao Pet</label>
                                <select
                                    className={styles.cartSelect}
                                    value={selectedPetId}
                                    onChange={e => setSelectedPetId(e.target.value)}
                                >
                                    <option value="">Nenhum (Venda só pro tutor)</option>
                                    {selectedTutor.pets.map(pet => (
                                        <option key={pet.id} value={pet.id}>{pet.name} ({pet.species})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Itens do Carrinho */}
                    <div className={styles.cartItemsContainer}>
                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <ShoppingCart size={40} color="var(--border)" />
                                <p>Sua cesta está vazia</p>
                            </div>
                        ) : (
                            <div className={styles.cartItemList}>
                                {cart.map((item) => (
                                    <div key={item.product_id} className={styles.cartItem}>
                                        <div className={styles.cartItemInfo}>
                                            <strong>{item.name}</strong>
                                            <div className={styles.cartItemDetails}>
                                                <span>{formatCurrency(item.unit_price)} unid.</span>
                                                <span className={styles.cartItemTotal}>{formatCurrency(item.total_price)}</span>
                                            </div>
                                        </div>
                                        <div className={styles.cartItemActions}>
                                            <div className={styles.quantityControls}>
                                                <button onClick={() => updateCartQuantity(item.product_id, -1)}><Minus size={14} /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateCartQuantity(item.product_id, 1)} disabled={item.quantity >= item.stock_quantity}><Plus size={14} /></button>
                                            </div>
                                            <button className={styles.removeBtn} onClick={() => removeFromCart(item.product_id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resumo e Pagamento */}
                    <div className={styles.checkoutSection}>
                        <div className={styles.discountRow}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label>Desconto Global</label>
                                <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '6px', padding: '2px' }}>
                                    <button 
                                        onClick={() => setGlobalDiscountType('percent')}
                                        style={{ 
                                            padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: globalDiscountType === 'percent' ? 'var(--color-navy)' : 'transparent',
                                            color: globalDiscountType === 'percent' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: globalDiscountType === 'percent' ? 700 : 400
                                        }}>%</button>
                                    <button 
                                        onClick={() => setGlobalDiscountType('fixed')}
                                        style={{ 
                                            padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: globalDiscountType === 'fixed' ? 'var(--color-navy)' : 'transparent',
                                            color: globalDiscountType === 'fixed' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: globalDiscountType === 'fixed' ? 700 : 400
                                        }}>R$</button>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0" 
                                max={globalDiscountType === 'percent' ? 100 : undefined}
                                className={styles.discountInput}
                                value={globalDiscount}
                                onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {selectedTutor && cashbackBalance > 0 && (
                            <div className={styles.cashbackCheckoutRow}>
                                <div className={styles.cashbackInfo}>
                                    <Coins size={16} color="var(--color-navy)" />
                                    <span>Saldo: <strong>{formatCurrency(cashbackBalance)}</strong></span>
                                </div>
                                <div className={styles.cashbackAction}>
                                    <input
                                        type="checkbox"
                                        id="useCashback"
                                        checked={isUsingCashback}
                                        onChange={(e) => {
                                            setIsUsingCashback(e.target.checked)
                                            setUseCashbackAmount(cashbackBalance)
                                        }}
                                    />
                                    <label htmlFor="useCashback">Usar Saldo</label>
                                </div>
                            </div>
                        )}

                        {isUsingCashback && (
                            <div className={styles.discountRow} style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                <label>Valor a descontar</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={cashbackBalance}
                                    step="0.01"
                                    className={styles.discountInput}
                                    style={{ width: '100px' }}
                                    value={useCashbackAmount}
                                    onChange={e => setUseCashbackAmount(Math.min(cashbackBalance, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                        )}

                        <div className={styles.paymentMethodsRow}>
                            <select className={styles.paymentSelect} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="cash">Dinheiro</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                            </select>

                            <select
                                className={`${styles.paymentSelect} ${paymentStatus === 'paid' ? styles.statusPaid : styles.statusPending}`}
                                value={paymentStatus}
                                onChange={e => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                            >
                                <option value="paid">✅ Pago (Gerar Caixa)</option>
                                <option value="pending">⏳ Pendente/Fiado</option>
                            </select>
                        </div>

                        <div className={styles.totalsArea}>
                            <div className={styles.totalRow}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(cartTotals.subtotal)}</span>
                            </div>
                            {cartTotals.totalDiscount > 0 && (
                                <div className={`${styles.totalRow} ${styles.discountText}`}>
                                    <span>Descontos</span>
                                    <span>- {formatCurrency(cartTotals.totalDiscount)}</span>
                                </div>
                            )}
                            <div className={styles.finalTotalRow}>
                                <span>Total a Pagar</span>
                                <span>{formatCurrency(cartTotals.finalTotal)}</span>
                            </div>
                        </div>

                        <button
                            className={styles.checkoutBtn}
                            disabled={cart.length === 0 || isCheckingOut}
                            onClick={handleCheckout}
                        >
                            {isCheckingOut ? 'Finalizando...' : 'Finalizar Venda'}
                        </button>
                    </div>
                </div>

                {/* Modal Gestão Produtos - Mantido Quase Igual */}
                {isModalOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>×</button>
                            <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <form onSubmit={handleSaveProduct}>
                                {/* Campos padrão ocultados p/ condensar o dump, manter inputs originais */}
                                <div className={styles.formGroup} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <ImageUpload bucket="products" url={formData.image_url} onUpload={v => setFormData(p => ({ ...p, image_url: v }))} onRemove={() => setFormData(p => ({ ...p, image_url: null }))} label="Foto" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nome</label>
                                    <input className={styles.input} type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Preço Custo (R$)</label>
                                        <input className={styles.input} type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Preço Venda (R$)</label>
                                        <input className={styles.input} type="number" step="0.01" required value={formData.selling_price} onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Estoque</label>
                                        <input className={styles.input} type="number" required value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Categoria</label>
                                        <select className={styles.select} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Código de Barras</label>
                                        <input className={styles.input} type="text" value={formData.bar_code} onChange={e => setFormData({ ...formData, bar_code: e.target.value })} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Validade</label>
                                        <DateInput
                                            value={formData.expiration_date}
                                            onChange={val => setFormData({ ...formData, expiration_date: val })}
                                            className={styles.input}
                                            yearRange={[new Date().getFullYear(), new Date().getFullYear() + 10]}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Descrição</label>
                                    <textarea className={styles.input} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="submit" className={styles.submitButton} style={{ width: 'auto' }}>Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showNFModal && checkoutSaleData && (
                    <EmitirNFModal
                        tipo="nfe"
                        origemTipo="pdv"
                        refId={checkoutSaleData.orderId}
                        total_amount={checkoutSaleData.total_amount}
                        tutor={checkoutSaleData.tutor}
                        produtos={checkoutSaleData.produtos}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={(status) => {
                            alert(`Nota Fiscal solicitada! Status: ${status}`)
                            setShowNFModal(false)
                        }}
                    />
                )}
            </div>
        </PlanGuard>
    )
}
