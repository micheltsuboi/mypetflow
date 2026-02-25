'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { getCashbackRules, createCashbackRule, deleteCashbackRule } from '@/app/actions/cashback'
import { Product } from '@/types/database'
import { Trash2, ShieldCheck, Ticket, Users, PlusCircle } from 'lucide-react'

export default function CashbackManagementPage() {
    const supabase = createClient()
    const [rules, setRules] = useState<any[]>([])
    const [tutorBalances, setTutorBalances] = useState<any[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form state
    const [type, setType] = useState<'category' | 'product'>('category')
    const [targetId, setTargetId] = useState('')
    const [percent, setPercent] = useState(5)
    const [validityMonths, setValidityMonths] = useState(2)

    const categories = ['Alimentação', 'Higiene', 'Brinquedos', 'Farmácia', 'Acessórios']

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            // Rules
            const rulesData = await getCashbackRules(profile.org_id)
            setRules(rulesData)

            // Balances
            const { data: balances } = await supabase
                .from('cashbacks')
                .select('balance, updated_at, customers(name, email)')
                .order('balance', { ascending: false })
            setTutorBalances(balances || [])

            // Products
            const { data: prods } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
            setProducts(prods || [])

        } catch (error) {
            console.error('Erro ao buscar dados de cashback:', error)
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetId) {
            alert('Por favor, selecione um alvo (produto ou categoria).')
            return
        }

        setIsSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()

            if (!profile?.org_id) return

            await createCashbackRule({
                org_id: profile.org_id,
                type,
                target_id: targetId,
                percent,
                validity_months: validityMonths,
                created_by: user.id
            })

            setTargetId('')
            setPercent(5)
            setValidityMonths(2)
            fetchData()
            alert('Regra criada com sucesso!')
        } catch (error) {
            console.error('Erro ao criar regra:', error)
            alert('Erro ao criar regra de cashback.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Deseja realmente remover esta regra de fidelidade?')) return

        try {
            await deleteCashbackRule(id)
            fetchData()
        } catch (error) {
            console.error('Erro ao deletar regra:', error)
        }
    }

    if (isLoading) {
        return <div className={styles.container}>Carregando painel de fidelidade...</div>
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>💎 Programa de Fidelidade</h1>
                    <p className={styles.subtitle}>Gerencie regras de cashback e veja o saldo dos tutores</p>
                </div>
            </header>

            <div className={styles.grid}>
                {/* Left: Setup Rule */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <PlusCircle size={20} /> Nova Regra
                    </h2>
                    <form className={styles.form} onSubmit={handleCreateRule}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Tipo de Regra</label>
                            <select
                                className={styles.select}
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value as any)
                                    setTargetId('')
                                }}
                            >
                                <option value="category">Por Categoria</option>
                                <option value="product">Por Produto</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {type === 'category' ? 'Selecionar Categoria' : 'Selecionar Produto'}
                            </label>
                            <select
                                className={styles.select}
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {type === 'category' ? (
                                    categories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))
                                ) : (
                                    products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Porcentagem de Cashback (%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={percent}
                                onChange={(e) => setPercent(Number(e.target.value))}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Validade do Crédito (Meses)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min="1"
                                max="24"
                                value={validityMonths}
                                onChange={(e) => setValidityMonths(Number(e.target.value))}
                                required
                            />
                            <small style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                O cashback gerado hoje expirará em {validityMonths} mês{validityMonths > 1 ? 'es' : ''}.
                            </small>
                        </div>

                        <button className={styles.submitBtn} disabled={isSaving}>
                            {isSaving ? 'Gravando...' : 'Ativar Regra'}
                        </button>
                    </form>
                </div>

                {/* Right: Active Rules */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Ticket size={20} /> Regras Ativas
                    </h2>
                    <div className={styles.rulesList}>
                        {rules.length === 0 ? (
                            <p className={styles.emptyState}>Nenhuma regra de cashback definida ainda.</p>
                        ) : (
                            rules.map(rule => {
                                let targetName = rule.target_id
                                if (rule.type === 'product') {
                                    targetName = products.find(p => p.id === rule.target_id)?.name || rule.target_id
                                }
                                return (
                                    <div key={rule.id} className={styles.ruleItem}>
                                        <div className={styles.ruleInfo}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span className={`${styles.badge} ${rule.type === 'category' ? styles.badgeCategory : styles.badgeProduct}`}>
                                                    {rule.type === 'category' ? 'Categoria' : 'Produto'}
                                                </span>
                                                <span className={styles.ruleTarget}>{targetName}</span>
                                            </div>
                                            <div className={styles.ruleMeta}>
                                                Cashback: <span className={styles.percentBadge}>{rule.percent}%</span>
                                                {rule.validity_months && ` • Expira em ${rule.validity_months} mês${rule.validity_months > 1 ? 'es' : ''}`}
                                            </div>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDeleteRule(rule.id)}
                                            title="Remover regra"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Balances */}
            <div className={styles.balanceGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <Users size={20} /> Saldos dos Tutores
                    </h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tutor</th>
                                    <th>Saldo Atual</th>
                                    <th>Última Atualização</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tutorBalances.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className={styles.emptyState}>Nenhum saldo acumulado.</td>
                                    </tr>
                                ) : (
                                    tutorBalances.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.customers?.name || 'Cliente'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.customers?.email}</div>
                                            </td>
                                            <td style={{ color: 'var(--color-navy)', fontWeight: 700, fontSize: '1.1rem' }}>
                                                R$ {Number(item.balance).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {new Date(item.updated_at).toLocaleString('pt-BR')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
