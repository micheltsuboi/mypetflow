'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

type ServiceArea = 'all' | 'banho_tosa' | 'creche' | 'hotel'

interface MonthlyData {
    month: string
    revenue: number
    expenses: number
    profit: number
}

interface ServiceRevenue {
    area: ServiceArea
    name: string
    revenue: number
    count: number
    percentage: number
}

const mockMonthlyData: MonthlyData[] = [
    { month: 'Set', revenue: 22400, expenses: 7200, profit: 15200 },
    { month: 'Out', revenue: 24800, expenses: 7800, profit: 17000 },
    { month: 'Nov', revenue: 26100, expenses: 8100, profit: 18000 },
    { month: 'Dez', revenue: 31200, expenses: 9500, profit: 21700 },
    { month: 'Jan', revenue: 25600, expenses: 8000, profit: 17600 },
    { month: 'Fev', revenue: 28750, expenses: 8420, profit: 20330 },
]

const mockServiceRevenue: ServiceRevenue[] = [
    { area: 'banho_tosa', name: '🛁 Banho + Tosa', revenue: 14200, count: 156, percentage: 49.4 },
    { area: 'creche', name: '🐕 Creche', revenue: 9800, count: 280, percentage: 34.1 },
    { area: 'hotel', name: '🏨 Hotel', revenue: 4750, count: 45, percentage: 16.5 },
]

export default function FinanceiroPage() {
    const [period, setPeriod] = useState<'month' | 'year'>('month')
    const [monthlyData] = useState<MonthlyData[]>(mockMonthlyData)
    const [serviceRevenue] = useState<ServiceRevenue[]>(mockServiceRevenue)

    const currentMonth = monthlyData[monthlyData.length - 1]
    const previousMonth = monthlyData[monthlyData.length - 2]
    const revenueGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                    <h1 className={styles.title}>💰 Controle Financeiro</h1>
                    <p className={styles.subtitle}>Visão geral das finanças do seu pet shop</p>
                </div>
                <div className={styles.periodToggle}>
                    <button
                        className={`${styles.periodBtn} ${period === 'month' ? styles.active : ''}`}
                        onClick={() => setPeriod('month')}
                    >
                        Este Mês
                    </button>
                    <button
                        className={`${styles.periodBtn} ${period === 'year' ? styles.active : ''}`}
                        onClick={() => setPeriod('year')}
                    >
                        Este Ano
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>💵</span>
                        <span className={`${styles.cardGrowth} ${Number(revenueGrowth) >= 0 ? styles.positive : styles.negative}`}>
                            {Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%
                        </span>
                    </div>
                    <span className={styles.cardValue}>{formatCurrency(currentMonth.revenue)}</span>
                    <span className={styles.cardLabel}>Faturamento</span>
                </div>

                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>📉</span>
                    </div>
                    <span className={`${styles.cardValue} ${styles.expenses}`}>{formatCurrency(currentMonth.expenses)}</span>
                    <span className={styles.cardLabel}>Despesas</span>
                </div>

                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>📈</span>
                    </div>
                    <span className={`${styles.cardValue} ${styles.profit}`}>{formatCurrency(currentMonth.profit)}</span>
                    <span className={styles.cardLabel}>Lucro Líquido</span>
                </div>

                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>📊</span>
                    </div>
                    <span className={styles.cardValue}>{((currentMonth.profit / currentMonth.revenue) * 100).toFixed(1)}%</span>
                    <span className={styles.cardLabel}>Margem de Lucro</span>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>📊 Faturamento Mensal</h2>
                <div className={styles.chart}>
                    {monthlyData.map((data, index) => (
                        <div key={data.month} className={styles.chartBar}>
                            <div className={styles.barContainer}>
                                <div
                                    className={styles.bar}
                                    style={{ height: `${(data.revenue / maxRevenue) * 100}%` }}
                                >
                                    <span className={styles.barValue}>{(data.revenue / 1000).toFixed(0)}k</span>
                                </div>
                            </div>
                            <span className={`${styles.barLabel} ${index === monthlyData.length - 1 ? styles.current : ''}`}>
                                {data.month}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revenue by Service */}
            <div className={styles.servicesSection}>
                <h2 className={styles.sectionTitle}>💼 Receita por Serviço</h2>
                <div className={styles.servicesList}>
                    {serviceRevenue.map(service => (
                        <div key={service.area} className={styles.serviceItem}>
                            <div className={styles.serviceHeader}>
                                <span className={styles.serviceName}>{service.name}</span>
                                <span className={styles.serviceRevenue}>{formatCurrency(service.revenue)}</span>
                            </div>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progress}
                                    style={{ width: `${service.percentage}%` }}
                                />
                            </div>
                            <div className={styles.serviceFooter}>
                                <span className={styles.serviceCount}>{service.count} atendimentos</span>
                                <span className={styles.servicePercentage}>{service.percentage}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Stats */}
            <div className={styles.quickStats}>
                <div className={styles.quickStat}>
                    <span className={styles.quickIcon}>🧾</span>
                    <div>
                        <span className={styles.quickValue}>481</span>
                        <span className={styles.quickLabel}>Atendimentos no mês</span>
                    </div>
                </div>
                <div className={styles.quickStat}>
                    <span className={styles.quickIcon}>💳</span>
                    <div>
                        <span className={styles.quickValue}>R$ 59,77</span>
                        <span className={styles.quickLabel}>Ticket Médio</span>
                    </div>
                </div>
                <div className={styles.quickStat}>
                    <span className={styles.quickIcon}>⏳</span>
                    <div>
                        <span className={styles.quickValue}>R$ 3.200</span>
                        <span className={styles.quickLabel}>A Receber</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
