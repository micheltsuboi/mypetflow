'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface HospitalExpenseItem {
    id: string
    org_id: string
    admission_id: string
    title: string
    amount: number
    created_at: string
}

export async function getAdmissionExpenses(admissionId: string): Promise<HospitalExpenseItem[]> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('hospital_admission_expenses')
            .select('*')
            .eq('admission_id', admissionId)
            .order('created_at', { ascending: true })

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                console.warn('Tabela hospital_admission_expenses ainda não existe no banco.')
                return []
            }
            console.error('Erro ao buscar despesas do internamento:', error)
            return []
        }

        return (data || []).map(e => ({
            ...e,
            amount: Number(e.amount) || 0
        }))
    } catch (err) {
        console.error('Erro de servidor em getAdmissionExpenses:', err)
        return []
    }
}

export async function addAdmissionExpense(admissionId: string, title: string, amount: number) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

        const cleanTitle = (title || '').trim()
        const cleanAmount = Math.max(0, Number(amount) || 0)

        if (!cleanTitle) {
            return { success: false, message: 'O título do item é obrigatório.' }
        }

        const { error } = await supabase
            .from('hospital_admission_expenses')
            .insert([{
                org_id: profile.org_id,
                admission_id: admissionId,
                title: cleanTitle,
                amount: cleanAmount,
                created_by: user.id
            }])

        if (error) throw error

        revalidatePath('/owner/hospital')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao adicionar item diversos:', err)
        return { success: false, message: err.message || 'Erro ao adicionar item' }
    }
}

export async function deleteAdmissionExpense(expenseId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

        const { error } = await supabase
            .from('hospital_admission_expenses')
            .delete()
            .eq('id', expenseId)
            .eq('org_id', profile.org_id)

        if (error) throw error

        revalidatePath('/owner/hospital')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao excluir item diversos:', err)
        return { success: false, message: err.message || 'Erro ao excluir item' }
    }
}

export async function getAdmissionFinancialSummary(admissionId: string) {
    try {
        const supabase = await createClient()

        // 1. Admission details
        const { data: admission } = await supabase
            .from('hospital_admissions')
            .select('*, services(*)')
            .eq('id', admissionId)
            .single()

        if (!admission) return null

        // Diárias
        const admittedDate = new Date(admission.admitted_at)
        const dischargeDate = admission.discharged_at ? new Date(admission.discharged_at) : new Date()
        const diffMs = dischargeDate.getTime() - admittedDate.getTime()
        const diffDaysRaw = diffMs / (1000 * 60 * 60 * 24)
        const numDiarias = Math.max(1, Math.ceil(diffDaysRaw))
        const dailyRate = Number(admission.services?.base_price) || 0
        const diariasTotal = numDiarias * dailyRate

        // 2. Medicações aplicadas (logs)
        const { data: logs } = await supabase
            .from('hospital_medication_logs')
            .select('*, hospital_medications(name)')
            .eq('admission_id', admissionId)

        // Buscar catálogo de medicações para precificação
        const { data: catalog } = await supabase
            .from('hospital_medication_catalog')
            .select('*')
            .eq('org_id', admission.org_id)

        const catalogMap = new Map<string, number>()
        if (catalog) {
            catalog.forEach(c => {
                catalogMap.set(c.name.toLowerCase().trim(), Number(c.sale_price_per_ml) || 0)
            })
        }

        let medTotal = 0
        const medLogsSummary = (logs || []).map(l => {
            const medName = l.hospital_medications?.name || ''
            const pricePerMl = catalogMap.get(medName.toLowerCase().trim()) || 0
            // Extrair ML do log se gravado ou parsear de notes
            let ml = Number(l.ml_applied) || 0
            if (ml === 0 && l.notes) {
                const match = l.notes.match(/(\d+[\.,]?\d*)\s*ml/i)
                if (match) ml = parseFloat(match[1].replace(',', '.'))
            }
            const logCost = Number(l.total_cost) > 0 ? Number(l.total_cost) : (ml * pricePerMl)
            medTotal += logCost
            return {
                id: l.id,
                name: medName,
                applied_at: l.applied_at,
                ml,
                pricePerMl,
                cost: logCost
            }
        })

        // 3. Itens Diversos (Despesas avulsas)
        const expenses = await getAdmissionExpenses(admissionId)
        const expensesTotal = expenses.reduce((acc, e) => acc + e.amount, 0)

        const grandTotal = diariasTotal + medTotal + expensesTotal

        return {
            numDiarias,
            dailyRate,
            diariasTotal,
            serviceName: admission.services?.name || 'Internamento Padrão',
            medLogsSummary,
            medTotal,
            expensesList: expenses,
            expensesTotal,
            grandTotal
        }
    } catch (err) {
        console.error('Erro em getAdmissionFinancialSummary:', err)
        return null
    }
}
