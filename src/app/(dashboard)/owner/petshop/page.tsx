'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Product, ProductFormData } from '@/types/database'
import ImageUpload from '@/components/ImageUpload'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import PlanGuard from '@/components/modules/PlanGuard'
import { searchTutorsForPDV, checkoutCart } from '@/app/actions/petshop'
import { getCashbackBalance } from '@/app/actions/cashback'
import { ShoppingCart, Plus, Minus, Trash2, Search, PackageOpen, Coins, Edit2 } from 'lucide-react'
import DateInput from '@/components/ui/DateInput'
import EmitirNFModal from '@/components/EmitirNFModal'
import SalesHistoryModal from '@/components/petshop/SalesHistoryModal'
import FiscalDocumentModal, { FiscalDocumentType } from '@/components/petshop/FiscalDocumentModal'
import { ReceiptText, ShoppingBag, LayoutDashboard } from 'lucide-react'
import InventoryManagement from '@/components/petshop/InventoryManagement'
import StatusModal, { StatusModalType } from '@/components/ui/StatusModal'

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
    fiscal?: {
        codigo_ncm: string
        cfop: string
        icms_situacao_tributaria: string
        unidade_comercial: string
    }
}

interface TutorSearchResult {
    id: string
    name: string
    cpf: string | null
    cpf_cnpj: string | null
    address: string | null
    neighborhood: string | null
    city: string | null
    pets: { id: string, name: string, species: string }[]
}

export default function PetshopPage() {
    const supabase = createClient()
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')

    // Navegação
    const [activeTab, setActiveTab] = useState<'pdv' | 'stock'>('pdv')

    // Modais de Status
    const [statusModal, setStatusModal] = useState<{ type: StatusModalType, title: string, message: string } | null>(null)

    // Gerenciador de Produtos (CRUD Modal)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [formData, setFormData] = useState<ProductFormData>({
        name: '', category: 'Alimentação', cost_price: 0, selling_price: 0,
        stock_quantity: 0, expiration_date: '', bar_code: '', description: '',
        codigo_ncm: '', cfop: '5102', icms_situacao_tributaria: '102'
    })

    // Modais de Controle e Navegação Mobile
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog')

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
    const [showFiscalModal, setShowFiscalModal] = useState(false)
    const [showNFModal, setShowNFModal] = useState(false)
    const [selectedFiscalType, setSelectedFiscalType] = useState<FiscalDocumentType | null>(null)
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
                .select('*, produtos_fiscal(*)')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            if (data) setProducts(data as any)
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
                    setStatusModal({
                        type: 'warning',
                        title: 'Limite de Estoque',
                        message: `Estoque máximo atingido para ${product.name} (${product.stock_quantity} un)`
                    })
                    return prev
                }
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price * (1 - item.discount_percent / 100) }
                        : item
                )
            }
            if (product.stock_quantity <= 0) {
                setStatusModal({
                    type: 'error',
                    title: 'Sem Estoque',
                    message: `O produto ${product.name} não possui estoque disponível no momento.`
                })
                return prev
            }
            const fiscalData = (product as any).produtos_fiscal?.[0]
            const newItem: CartItem = {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                name: product.name,
                quantity: 1,
                unit_price: product.price,
                discount_percent: 0,
                total_price: product.price,
                stock_quantity: product.stock_quantity,
                image_url: product.image_url,
                fiscal: fiscalData ? {
                    codigo_ncm: fiscalData.codigo_ncm,
                    cfop: fiscalData.cfop,
                    icms_situacao_tributaria: fiscalData.icms_situacao_tributaria,
                    unidade_comercial: fiscalData.unidade_comercial
                } : undefined
            }
            return [...prev, newItem]
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
            const nfeProducts = cart.map(item => ({
                id: item.product_id,
                descricao: item.name,
                quantidade: item.quantity,
                valor_unitario: item.unit_price,
                total_price: item.total_price,
                discount_percent: item.discount_percent,
                ncm: item.fiscal?.codigo_ncm || '00000000',
                cfop: item.fiscal?.cfop || '5102',
                cst: item.fiscal?.icms_situacao_tributaria || '102',
                unidade: item.fiscal?.unidade_comercial || 'un'
            }))

            // Popula dados para NFe
            setCheckoutSaleData({
                orderId: res.orderId || Math.random().toString(), 
                total_amount: cartTotals.finalTotal,
                tutor: selectedTutor ? {
                    nome: selectedTutor.name,
                    cpf: selectedTutor.cpf_cnpj || selectedTutor.cpf || undefined,
                    endereco: {
                        logradouro: selectedTutor.address || undefined,
                        bairro: selectedTutor.neighborhood || undefined,
                        city: selectedTutor.city || undefined,
                        cep: (selectedTutor as any).cep || undefined,
                        uf: (selectedTutor as any).uf || undefined
                    }
                } : undefined,
                produtos: nfeProducts
            })

            // MUDANÇA: Não mostramos alert(), vamos direto para o modal fiscal que já diz "Venda Finalizada"
            
            // Abre o modal de seleção de tipo de documento fiscal
            if (res.orderId) {
                setShowFiscalModal(true)
            }

            // Reset cart and states
            setCart([])
            setSelectedTutor(null)
            setSelectedPetId('')
            setGlobalDiscount(0)
            setTutorQuery('')
            setIsUsingCashback(false)
            setUseCashbackAmount(0)
            setShowCheckoutModal(false)
            setMobileView('catalog')
            fetchProducts() // Update local stock display
        } else {
                setStatusModal({
                    type: 'error',
                    title: 'Falha no Checkout',
                    message: res.message || 'Ocorreu um erro ao processar o pagamento.'
                })
            }
        } catch (error) {
            console.error('Checkout error:', error)
            setStatusModal({
                type: 'error',
                title: 'Erro de Sistema',
                message: 'Não foi possível completar a transação. Verifique sua conexão.'
            })
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
            const p = product as any
            // Handle different shapes of produtos_fiscal (array from select or single if transformed)
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

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault()
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
                min_stock_alert: 5,
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

            // Salvar dados fiscais (Sempre garantir que o produto_id seja passado)
            if (productId) {
                const { error: fiscalError } = await supabase.from('produtos_fiscal').upsert({
                    produto_id: productId,
                    codigo_ncm: formData.codigo_ncm?.replace(/\D/g, '') || '00000000',
                    cfop: formData.cfop || '5102',
                    icms_situacao_tributaria: formData.icms_situacao_tributaria || '102',
                    unidade_comercial: 'un'
                }, { onConflict: 'produto_id' })
                
                if (fiscalError) {
                    console.error('Erro ao salvar dados fiscais:', fiscalError)
                }
            }

            await fetchProducts()
            setIsModalOpen(false)
            setStatusModal({
                type: 'success',
                title: 'Sucesso',
                message: editingProduct ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'
            })
        } catch (error) {
            console.error('Erro ao salvar produto:', error)
            setStatusModal({
                type: 'error',
                title: 'Erro ao Salvar',
                message: 'Não foi possível salvar as alterações do produto.'
            })
        }
    }

    if (isLoading) {
        return <div className={styles.loadingState}>Carregando PDV...</div>
    }

    return (
        <PlanGuard requiredModule="petshop">
            <div className={styles.pdvContainer}>
                
                {/* Tabs Navigation */}
                <div className={styles.tabNav}>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'pdv' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('pdv')}
                    >
                        <ShoppingBag size={18} /> Vendas
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'stock' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('stock')}
                    >
                        <LayoutDashboard size={18} /> Gestão de Estoque
                    </button>
                </div>

                {activeTab === 'stock' ? (
                    <InventoryManagement products={products} onUpdate={fetchProducts} />
                ) : (
                    <div className={styles.pdvContent}>
                        {/* LADO ESQUERDO: Catálogo de Produtos */}
                        <div className={`${styles.catalogSection} ${mobileView !== 'catalog' ? styles.mobileHidden : ''}`}>
                            <div className={styles.catalogHeader}>
                                <div>
                                    <h1 className={styles.title}>🛒 Ponto de Venda</h1>
                                    <p className={styles.subtitle}>Selecione os produtos para adicionar ao carrinho</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button 
                                        className={styles.addButton} 
                                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                        onClick={() => setShowHistoryModal(true)}
                                    >
                                        <ReceiptText size={18} /> Extrato
                                    </button>
                                </div>
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
                                {filteredProducts.map(product => {
                                    const outOfStock = product.stock_quantity <= 0
                                    return (
                                        <div
                                            key={product.id}
                                            className={`${styles.pdvProductCard} ${outOfStock ? styles.outOfStock : ''}`}
                                            onClick={() => !outOfStock && addToCart(product)}
                                        >
                                            <div className={styles.pdvImageHero}>
                                                {product.image_url ?
                                                    <img src={product.image_url} alt={product.name} /> :
                                                    <div className={styles.pdvImagePlaceholder}>📦</div>
                                                }
                                            </div>
                                            <div className={styles.pdvProductInfo}>
                                                <div className={styles.pdvProductDetails}>
                                                    <span className={styles.pdvCategory}>{product.category}</span>
                                                    <h3 className={styles.pdvName} title={product.name}>{product.name}</h3>
                                                </div>
                                                <div className={styles.pdvPriceRow}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                                        <span className={styles.pdvPrice}>{formatCurrency(product.price)}</span>
                                                        <span className={`${styles.pdvStock} ${product.stock_quantity < 5 ? styles.lowStock : ''}`}>
                                                            {product.stock_quantity} un
                                                        </span>
                                                    </div>
                                                    <button 
                                                        className={styles.editButton} 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleOpenModal(product)
                                                        }}
                                                        title="Editar Produto"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Botão flutuante Ver Carrinho para Mobile */}
                {mobileView === 'catalog' && (
                    <button 
                        type="button"
                        className={styles.mobileCartToggleBtn}
                        onClick={() => setMobileView('cart')}
                    >
                        <ShoppingCart size={18} />
                        Ver Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)
                    </button>
                )}

                {/* LADO DIREITO: Carrinho de Compras */}
                <div className={`${styles.cartSection} ${mobileView !== 'cart' ? styles.mobileHidden : ''}`}>
                    {/* Botão Voltar para Mobile */}
                    <button 
                        type="button"
                        className={styles.backToCatalogBtn}
                        onClick={() => setMobileView('catalog')}
                    >
                        ← Voltar para os Produtos
                    </button>

                    <div className={styles.cartHeader}>
                        <ShoppingCart size={24} />
                        <h2>Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</h2>
                    </div>

                    <div className={styles.cartScrollableArea}>
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
                                                    <strong>{tutor.name} {tutor.pets.length > 0 && `(🐾 ${tutor.pets.map(p => p.name).join(', ')})`}</strong>
                                                    <small>{tutor.cpf ? `CPF: ${tutor.cpf}` : ''}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.selectedCustomerCard}>
                                    <div className={styles.tutorInfoCompact}>
                                        <strong>{selectedTutor.name}</strong>
                                        {selectedTutor.pets.length > 0 && (
                                            <span className={styles.petBadge}>🐾 {selectedTutor.pets.map(p => p.name).join(', ')}</span>
                                        )}
                                    </div>
                                    <button className={styles.removeLinkedBtn} onClick={() => {
                                        setSelectedTutor(null)
                                        setSelectedPetId('')
                                    }}>
                                        ✕
                                    </button>
                                </div>
                            )}

                            {selectedTutor && selectedTutor.pets.length > 0 && (
                                <div style={{ marginTop: '0.35rem' }}>
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

                        {/* Resumo Simplificado */}
                        {cart.length > 0 && (
                            <div className={styles.checkoutSection}>
                                <div className={styles.totalsArea} style={{ marginBottom: 0 }}>
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
                                        <span>Total</span>
                                        <span>{formatCurrency(cartTotals.finalTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão de finalizar fixo no rodapé do carrinho */}
                    <div className={styles.cartFooter}>
                        <button
                            type="button"
                            className={styles.checkoutBtn}
                            disabled={cart.length === 0}
                            onClick={() => setShowCheckoutModal(true)}
                        >
                            Finalizar Venda
                        </button>
                    </div>
                </div>

                    </div>
                )}


                {showCheckoutModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowCheckoutModal(false)}>
                        <div className={styles.modalContent} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeButton} onClick={() => setShowCheckoutModal(false)}>
                                ✕
                            </button>
                            
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                💳 Fechamento da Venda
                            </h2>

                            {/* Resumo da Venda */}
                            <div className={styles.checkoutSummaryCard}>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Itens a processar:</span>
                                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{cart.reduce((a, b) => a + b.quantity, 0)} produtos</strong>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subtotal:</span>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--primary)' }}>{formatCurrency(cartTotals.subtotal)}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                                {/* Desconto Global */}
                                <div className={styles.discountRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label className={styles.label} style={{ margin: 0 }}>Desconto Global</label>
                                        <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '6px', padding: '2px' }}>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setGlobalDiscountType('percent')
                                                    setGlobalDiscount(0)
                                                }}
                                                style={{ 
                                                    padding: '3px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                    background: globalDiscountType === 'percent' ? 'var(--color-navy)' : 'transparent',
                                                    color: globalDiscountType === 'percent' ? 'white' : 'var(--text-secondary)',
                                                    fontWeight: globalDiscountType === 'percent' ? 700 : 400
                                                }}>%</button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setGlobalDiscountType('fixed')
                                                    setGlobalDiscount(0)
                                                }}
                                                style={{ 
                                                    padding: '3px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                    background: globalDiscountType === 'fixed' ? 'var(--color-navy)' : 'transparent',
                                                    color: globalDiscountType === 'fixed' ? 'white' : 'var(--text-secondary)',
                                                    fontWeight: globalDiscountType === 'fixed' ? 700 : 400
                                                }}>R$</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                                        <input
                                            type="number"
                                            min="0" 
                                            max={globalDiscountType === 'percent' ? 100 : undefined}
                                            className={styles.input}
                                            value={globalDiscount || ''}
                                            onChange={e => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                            style={{ flex: 1, padding: '0.5rem' }}
                                        />
                                        <div className={styles.quickDiscountButtons}>
                                            {globalDiscountType === 'percent' ? (
                                                <>
                                                    <button type="button" onClick={() => setGlobalDiscount(5)}>5%</button>
                                                    <button type="button" onClick={() => setGlobalDiscount(10)}>10%</button>
                                                    <button type="button" onClick={() => setGlobalDiscount(15)}>15%</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => setGlobalDiscount(5)}>5</button>
                                                    <button type="button" onClick={() => setGlobalDiscount(10)}>10</button>
                                                    <button type="button" onClick={() => setGlobalDiscount(20)}>20</button>
                                                </>
                                            )}
                                            <button type="button" className={styles.clearDiscountBtn} onClick={() => setGlobalDiscount(0)}>Zerar</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cashback */}
                                {selectedTutor && cashbackBalance > 0 && (
                                    <div className={styles.cashbackCheckoutRow} style={{ margin: 0 }}>
                                        <div className={styles.cashbackInfo}>
                                            <Coins size={16} color="var(--color-navy)" />
                                            <span>Saldo de Cashback: <strong>{formatCurrency(cashbackBalance)}</strong></span>
                                        </div>
                                        <div className={styles.cashbackAction}>
                                            <input
                                                type="checkbox"
                                                id="modalUseCashback"
                                                checked={isUsingCashback}
                                                onChange={(e) => {
                                                    setIsUsingCashback(e.target.checked)
                                                    setUseCashbackAmount(cashbackBalance)
                                                }}
                                            />
                                            <label htmlFor="modalUseCashback">Usar Saldo</label>
                                        </div>
                                    </div>
                                )}

                                {isUsingCashback && (
                                    <div className={styles.formGroup} style={{ margin: 0 }}>
                                        <label className={styles.label}>Valor do Cashback a descontar</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={cashbackBalance}
                                            step="0.01"
                                            className={styles.input}
                                            style={{ width: '120px' }}
                                            value={useCashbackAmount}
                                            onChange={e => setUseCashbackAmount(Math.min(cashbackBalance, parseFloat(e.target.value) || 0))}
                                        />
                                    </div>
                                )}

                                {/* Forma de Pagamento e Status */}
                                <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label}>Forma de Pagamento</label>
                                    <div className={styles.paymentMethodsGrid}>
                                        <button
                                            type="button"
                                            className={`${styles.paymentMethodBtn} ${paymentMethod === 'cash' ? styles.activePayment : ''}`}
                                            onClick={() => setPaymentMethod('cash')}
                                        >
                                            💵 Dinheiro
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.paymentMethodBtn} ${paymentMethod === 'pix' ? styles.activePayment : ''}`}
                                            onClick={() => setPaymentMethod('pix')}
                                        >
                                            ⚡ PIX
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.paymentMethodBtn} ${paymentMethod === 'credit' ? styles.activePayment : ''}`}
                                            onClick={() => setPaymentMethod('credit')}
                                        >
                                            💳 Crédito
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.paymentMethodBtn} ${paymentMethod === 'debit' ? styles.activePayment : ''}`}
                                            onClick={() => setPaymentMethod('debit')}
                                        >
                                            💳 Débito
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.label}>Status do Pagamento</label>
                                    <div className={styles.paymentStatusRow}>
                                        <button
                                            type="button"
                                            className={`${styles.statusToggleBtn} ${paymentStatus === 'paid' ? styles.statusPaidActive : ''}`}
                                            onClick={() => setPaymentStatus('paid')}
                                            style={{ padding: '0.75rem' }}
                                        >
                                            ✅ Pago (Registrar Entrada)
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.statusToggleBtn} ${paymentStatus === 'pending' ? styles.statusPendingActive : ''}`}
                                            onClick={() => setPaymentStatus('pending')}
                                            style={{ padding: '0.75rem' }}
                                        >
                                            ⏳ Fiado / Pendente
                                        </button>
                                    </div>
                                </div>

                                {/* Totais Finais */}
                                <div className={styles.totalsArea} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', margin: '0.5rem 0 0 0' }}>
                                    <div className={styles.totalRow}>
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(cartTotals.subtotal)}</span>
                                    </div>
                                    {cartTotals.totalDiscount > 0 && (
                                        <div className={`${styles.totalRow} ${styles.discountText}`}>
                                            <span>Descontos Aplicados</span>
                                            <span>- {formatCurrency(cartTotals.totalDiscount)}</span>
                                        </div>
                                    )}
                                    <div className={styles.finalTotalRow} style={{ fontSize: '1.25rem', paddingTop: '0.75rem' }}>
                                        <span>Total a Pagar</span>
                                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(cartTotals.finalTotal)}</span>
                                    </div>
                                </div>

                                {/* Ações do Modal */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className={styles.submitButton}
                                        style={{ flex: 1, background: '#10B981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', margin: 0 }}
                                        disabled={isCheckingOut}
                                        onClick={handleCheckout}
                                    >
                                        {isCheckingOut ? 'Finalizando...' : 'Confirmar Venda'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showFiscalModal && checkoutSaleData && (
                    <FiscalDocumentModal
                        totalAmount={checkoutSaleData.total_amount}
                        onClose={() => setShowFiscalModal(false)}
                        onSelect={(type: FiscalDocumentType) => {
                            setShowFiscalModal(false)
                            if (type !== 'none') {
                                setSelectedFiscalType(type)
                                setShowNFModal(true)
                            }
                        }}
                    />
                )}

                {showNFModal && checkoutSaleData && selectedFiscalType && selectedFiscalType !== 'none' && (
                    <EmitirNFModal
                        tipo={selectedFiscalType as any}
                        origemTipo="pdv"
                        refId={checkoutSaleData.orderId}
                        total_amount={checkoutSaleData.total_amount}
                        tutor={checkoutSaleData.tutor}
                        produtos={checkoutSaleData.produtos}
                        onClose={() => setShowNFModal(false)}
                        onSuccess={(status) => {
                            setStatusModal({
                                type: 'success',
                                title: 'Solicitação Enviada',
                                message: `O documento fiscal foi solicitado com sucesso! Status: ${status}`
                            })
                            setShowNFModal(false)
                        }}
                    />
                )}

                {showHistoryModal && (
                    <SalesHistoryModal onClose={() => setShowHistoryModal(false)} />
                )}

                {statusModal && (
                    <StatusModal 
                        type={statusModal.type}
                        title={statusModal.title}
                        message={statusModal.message}
                        onClose={() => setStatusModal(null)}
                    />
                )}

                {isModalOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                                ✕
                            </button>
                            <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <form onSubmit={handleSaveProduct} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.row}>
                                    <div className={styles.col} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <ImageUpload 
                                            bucket="products" 
                                            url={formData.image_url} 
                                            onUpload={v => setFormData(p => ({ ...p, image_url: v }))} 
                                            onRemove={() => setFormData(p => ({ ...p, image_url: null }))} 
                                            label="Foto do Produto" 
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Nome do Produto</label>
                                    <input className={styles.input} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Preço de Custo (R$)</label>
                                        <input className={styles.input} type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Preço de Venda (R$)</label>
                                        <input className={styles.input} type="number" step="0.01" required value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Estoque Atual</label>
                                        <input className={styles.input} type="number" required value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 0})} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Categoria</label>
                                        <select className={styles.select} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                            {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>NCM</label>
                                        <input className={styles.input} placeholder="0000.00.00" value={formData.codigo_ncm} onChange={e => setFormData({...formData, codigo_ncm: e.target.value})} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>CFOP</label>
                                        <input className={styles.input} placeholder="5102" value={formData.cfop} onChange={e => setFormData({...formData, cfop: e.target.value})} />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.col}>
                                        <label className={styles.label}>CSOSN / CST</label>
                                        <input className={styles.input} placeholder="102" value={formData.icms_situacao_tributaria} onChange={e => setFormData({...formData, icms_situacao_tributaria: e.target.value})} />
                                    </div>
                                    <div className={styles.col}>
                                        <label className={styles.label}>Código de Barras</label>
                                        <input className={styles.input} value={formData.bar_code} onChange={e => setFormData({...formData, bar_code: e.target.value})} />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Descrição</label>
                                    <textarea className={styles.input} rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                                <button type="submit" className={styles.submitButton} style={{ marginTop: '1rem' }}>
                                    {editingProduct ? 'Salvar Alterações' : 'Salvar Produto'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </PlanGuard>
    )
}
