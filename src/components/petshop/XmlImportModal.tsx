'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { X, UploadCloud, FileText, Check, AlertCircle } from 'lucide-react'
import styles from './XmlImportModal.module.css'
import { Product } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface XmlImportModalProps {
    onClose: () => void
    onSuccess: () => void
    existingProducts: Product[]
}

interface ParsedProduct {
    id?: string // Se existir no banco
    name: string
    bar_code: string
    codigo_ncm: string
    cfop: string
    unidade_comercial: string
    stock_quantity: number
    cost_price: number
    selling_price: number
    category: string
    icms_situacao_tributaria: string
    status: 'new' | 'update'
    expiration_date: string
}

export default function XmlImportModal({ onClose, onSuccess, existingProducts }: XmlImportModalProps) {
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [parsedItems, setParsedItems] = useState<ParsedProduct[]>([])
    const [defaultMargin, setDefaultMargin] = useState<number>(50) // Porcentagem padrão
    const [defaultCategory, setDefaultCategory] = useState<string>('Alimentação')
    const [xmlFileName, setXmlFileName] = useState<string | null>(null)

    const categories = ['Alimentação', 'Higiene', 'Brinquedos', 'Farmácia', 'Acessórios']

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const processFile = (file: File) => {
        setXmlFileName(file.name)
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            parseXml(text)
        }
        reader.readAsText(file)
    }

    const parseXml = (xmlText: string) => {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

        // Buscar todas as tags <det> que representam os itens
        const detNodes = xmlDoc.getElementsByTagName('det')
        const items: ParsedProduct[] = []

        for (let i = 0; i < detNodes.length; i++) {
            const det = detNodes[i]
            const prod = det.getElementsByTagName('prod')[0]
            const imposto = det.getElementsByTagName('imposto')[0]

            if (prod) {
                const name = prod.getElementsByTagName('xProd')[0]?.textContent || ''
                let ean = prod.getElementsByTagName('cEAN')[0]?.textContent || ''
                if (ean === 'SEM GTIN') ean = ''
                const ncm = prod.getElementsByTagName('NCM')[0]?.textContent || ''
                const cfop = prod.getElementsByTagName('CFOP')[0]?.textContent || '5102'
                const uCom = prod.getElementsByTagName('uCom')[0]?.textContent || 'UN'
                const qCom = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent || '0')
                const vUnCom = parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent || '0')

                // Tentar pegar CST ou CSOSN do ICMS
                let cst = '102'
                if (imposto) {
                    const icms = imposto.getElementsByTagName('ICMS')[0]
                    if (icms) {
                        const children = icms.children
                        if (children.length > 0) {
                            cst = children[0].getElementsByTagName('CST')[0]?.textContent || 
                                  children[0].getElementsByTagName('CSOSN')[0]?.textContent || '102'
                        }
                    }
                }

                // Verificar se o produto já existe pelo código de barras
                const existing = ean ? existingProducts.find(p => p.bar_code === ean) : undefined

                const cost_price = vUnCom
                const selling_price = cost_price + (cost_price * (defaultMargin / 100))

                items.push({
                    id: existing?.id,
                    name,
                    bar_code: ean,
                    codigo_ncm: ncm,
                    cfop,
                    unidade_comercial: uCom,
                    stock_quantity: Math.floor(qCom),
                    cost_price,
                    selling_price: existing ? existing.price : selling_price,
                    category: existing ? existing.category : defaultCategory,
                    icms_situacao_tributaria: cst,
                    status: existing ? 'update' : 'new',
                    expiration_date: existing?.expiration_date || ''
                })
            }
        }
        setParsedItems(items)
    }

    // Atualiza os preços de venda quando a margem padrão muda
    useEffect(() => {
        if (parsedItems.length > 0) {
            setParsedItems(prev => prev.map(item => {
                if (item.status === 'new') {
                    const selling_price = item.cost_price + (item.cost_price * (defaultMargin / 100))
                    return { ...item, selling_price }
                }
                return item
            }))
        }
    }, [defaultMargin])

    const handleItemChange = (index: number, field: keyof ParsedProduct, value: any) => {
        setParsedItems(prev => {
            const newItems = [...prev]
            newItems[index] = { ...newItems[index], [field]: value }
            return newItems
        })
    }

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const handleSave = async () => {
        if (parsedItems.length === 0) return
        setIsLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não logado')
            const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
            if (!profile?.org_id) throw new Error('Organização não encontrada')

            for (const item of parsedItems) {
                if (item.status === 'update' && item.id) {
                    // Atualiza estoque somando e altera validade/preço se modificados
                    const existingProduct = existingProducts.find(p => p.id === item.id)
                    const newStock = (existingProduct?.stock_quantity || 0) + item.stock_quantity

                    await supabase.from('products').update({
                        stock_quantity: newStock,
                        cost_price: item.cost_price,
                        price: item.selling_price,
                        expiration_date: item.expiration_date || null
                    }).eq('id', item.id)

                    // Atualiza dados fiscais se necessário
                    await supabase.from('produtos_fiscal').upsert({
                        produto_id: item.id,
                        codigo_ncm: item.codigo_ncm,
                        cfop: item.cfop,
                        icms_situacao_tributaria: item.icms_situacao_tributaria,
                        unidade_comercial: item.unidade_comercial
                    }, { onConflict: 'produto_id' })

                } else {
                    // Cria novo produto
                    const productData = {
                        org_id: profile.org_id,
                        name: item.name,
                        category: item.category,
                        cost_price: item.cost_price,
                        price: item.selling_price,
                        stock_quantity: item.stock_quantity,
                        expiration_date: item.expiration_date || null,
                        bar_code: item.bar_code,
                        is_active: true
                    }

                    const { data, error } = await supabase.from('products').insert(productData).select('id').single()
                    if (error) throw error

                    if (data?.id) {
                        await supabase.from('produtos_fiscal').insert({
                            produto_id: data.id,
                            codigo_ncm: item.codigo_ncm,
                            cfop: item.cfop,
                            icms_situacao_tributaria: item.icms_situacao_tributaria,
                            unidade_comercial: item.unidade_comercial
                        })
                    }
                }
            }

            onSuccess()
        } catch (error) {
            console.error('Erro ao importar produtos', error)
            alert('Erro ao importar produtos. Verifique o console para mais detalhes.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={20} />
                </button>
                
                <h2 className={styles.title}><FileText size={24} /> Importar XML da NF-e</h2>

                {!xmlFileName && (
                    <div 
                        className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault()
                            setIsDragging(false)
                            if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <p>Arraste e solte o arquivo XML da NF-e aqui</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>ou clique para selecionar</p>
                        <input type="file" accept=".xml" ref={fileInputRef} onChange={handleFileSelect} />
                    </div>
                )}

                {parsedItems.length > 0 && (
                    <>
                        <div className={styles.settingsRow}>
                            <div className={styles.inputGroup}>
                                <label>Categoria Padrão (Novos)</label>
                                <select 
                                    className={styles.input} 
                                    value={defaultCategory}
                                    onChange={(e) => setDefaultCategory(e.target.value)}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Margem de Lucro Padrão (%)</label>
                                <input 
                                    type="number" 
                                    className={styles.input} 
                                    value={defaultMargin}
                                    onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}></div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                Produtos já existentes terão a quantidade <strong>somada</strong> ao estoque atual.
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Produto</th>
                                        <th>Cód. Barras</th>
                                        <th>Qtd (Entrada)</th>
                                        <th>Custo Unit.</th>
                                        <th>Preço Venda</th>
                                        <th>Validade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                {item.status === 'new' 
                                                    ? <span className={styles.statusNew}>Novo</span>
                                                    : <span className={styles.statusUpdate}>Atualizar Estoque</span>
                                                }
                                            </td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    className={styles.input} 
                                                    value={item.name} 
                                                    onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                                    style={{ width: '200px' }}
                                                />
                                            </td>
                                            <td>{item.bar_code || '-'}</td>
                                            <td>{item.stock_quantity} {item.unidade_comercial}</td>
                                            <td>{formatCurrency(item.cost_price)}</td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className={styles.tableInput} 
                                                    value={item.selling_price} 
                                                    onChange={e => handleItemChange(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="date" 
                                                    className={styles.tableInput}
                                                    value={item.expiration_date}
                                                    onChange={e => handleItemChange(idx, 'expiration_date', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.footer}>
                            <button className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>Cancelar</button>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={isLoading}>
                                {isLoading ? 'Importando...' : <><Check size={18} /> Confirmar Importação ({parsedItems.length})</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
