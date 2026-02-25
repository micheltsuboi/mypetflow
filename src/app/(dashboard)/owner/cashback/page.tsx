'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import { getCashbackRules, createCashbackRule, deleteCashbackRule, getCashbackHistory } from '@/app/actions/cashback'
import { Product } from '@/types/database'
import { Trash2, ShieldCheck, Ticket, Users, PlusCircle, History, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export default function CashbackManagementPage() {
    const supabase = createClient()
    const [rules, setRules] = useState<any[]>([])
    const [tutorBalances, setTutorBalances] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [stats, setStats] = useState({ totalEarned: 0, totalSpent: 0, activeBalance: 0 })

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

            // History
            const historyData = await getCashbackHistory(profile.org_id)
            setHistory(historyData)

            // Calculate Stats
            const earned = historyData?.filter(h => h.type === 'earn').reduce((acc, current) => acc + Number(current.amount), 0) || 0
            const spent = historyData?.filter(h => h.type === 'spend').reduce((acc, current) => acc + Number(current.amount), 0) || 0
            const currentBalance = balances?.reduce((acc, current) => acc + Number(current.balance), 0) || 0

            setStats({
                totalEarned: earned,
                totalSpent: spent,
                activeBalance: currentBalance
            })

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
        } catch (error: any) {
            console.error('Erro ao criar regra:', error)
            alert('Erro ao criar regra de cashback: ' + (error.message || 'Erro desconhecido'))
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
                    <p className={styles.subtitle}>Gerencie regras de cashback e veja o desempenho do programa</p>
                </div>
            </header>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>
                        <TrendingUp size={16} /> Total Gerado
                    </div>
                    <div className={`${styles.statValue} ${styles.statValuePositive}`}>
                        R$ {stats.totalEarned.toFixed(2).replace('.', ',')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>
                        <ArrowDownCircle size={16} /> Total Resgatado
                    </div>
                    <div className={`${styles.statValue} ${styles.statValueNegative}`}>
                        R$ {stats.totalSpent.toFixed(2).replace('.', ',')}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>
                        <Wallet size={16} /> Saldo em Aberto
                    </div>
                    <div className={styles.statValue}>
                        R$ {stats.activeBalance.toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>

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
                                            <td>
                                                <span className={styles.balanceValue}>
                                                    R$ {Number(item.balance).toFixed(2).replace('.', ',')}
                                                </span>
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

            {/* History Table */}
            <div className={styles.balanceGrid} style={{ marginTop: '2.5rem' }}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        <History size={20} /> Histórico de Movimentações
                    </h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tutor</th>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Descrição</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyState}>Nenhuma movimentação registrada.</td>
                                    </tr>
                                ) : (
                                    history.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {new Date(item.created_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td>{item.customers?.name || 'Cliente'}</td>
                                            <td>
                                                <span className={`${styles.historyType} ${item.type === 'earn' ? styles.historyType_earn : styles.historyType_spend}`}>
                                                    {item.type === 'earn' ? 'ACÚMULO' : 'RESGATE'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={item.type === 'earn' ? styles.historyAmount_earn : styles.historyAmount_spend}>
                                                    {item.type === 'earn' ? '+' : '-'} R$ {Number(item.amount).toFixed(2).replace('.', ',')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {item.description}
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
