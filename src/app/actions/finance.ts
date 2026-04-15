'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getExpenseCategories() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data: existing } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('name', { ascending: true })

    if (existing && existing.length > 0) return existing

    const defaultCategories = [
        'Aluguel / Condomínio',
        'Energia Elétrica',
        'Água e Esgoto',
        'Internet e Telefone',
        'Salários e Encargos',
        'Insumos e Produtos Pet',
        'Impostos e Taxas',
        'Marketing e Publicidade',
        'Manutenção e Reparos',
        'Limpeza e Higiene',
        'Transporte / Combustível',
        'Outros'
    ]

    const { data: inserted, error } = await supabase
        .from('expense_categories')
        .insert(defaultCategories.map(name => ({ org_id: profile.org_id, name })))
        .select()

    if (error) {
        console.error('Erro ao semear categorias:', error)
        return []
    }

    return inserted || []
}

export async function createExpenseCategory(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Usuário não autenticado' }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

    const { error } = await supabase
        .from('expense_categories')
        .insert({
            org_id: profile.org_id,
            name
        })

    if (error) return { success: false, message: error.message }
    
    revalidatePath('/owner/financeiro')
    return { success: true }
}

export async function createExpense(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Usuário não autenticado' }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

    const isRecurring = formData.get('is_recurring') === 'true'
    const categoryId = formData.get('category_id') as string || null
    const categoryName = formData.get('category_name') as string
    const description = formData.get('description') as string
    const amount = parseFloat(formData.get('amount') as string)
    const startDate = formData.get('date') as string || new Date().toISOString().split('T')[0]

    if (isRecurring) {
        const { error } = await supabase
            .from('recurring_expenses')
            .insert({
                org_id: profile.org_id,
                category_id: categoryId,
                category_name: categoryName,
                description,
                amount,
                start_date: startDate,
                is_active: true
            })
        if (error) return { success: false, message: error.message }
    } else {
        const { error } = await supabase
            .from('financial_transactions')
            .insert({
                org_id: profile.org_id,
                type: 'expense',
                category: categoryName,
                amount,
                description,
                date: startDate,
                created_by: user.id
            })
        if (error) return { success: false, message: error.message }
    }

    revalidatePath('/owner/financeiro')
    return { success: true }
}

export async function getRecurringExpenses() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('recurring_expenses')
        .select(`
            *,
            expense_categories(name)
        `)
        .eq('org_id', profile.org_id)
        .eq('is_active', true)

    return data || []
}

export async function getRecurringExceptions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('recurring_expense_exceptions')
        .select('*, recurring_expenses!inner(org_id)')
        .eq('recurring_expenses.org_id', profile.org_id)

    return data || []
}

export async function cancelRecurringExpenseForMonth(recurringId: string, monthYear: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('recurring_expense_exceptions')
        .insert({
            recurring_expense_id: recurringId,
            month_year: monthYear
        })

    if (error) return { success: false, message: error.message }
    
    revalidatePath('/owner/financeiro')
    return { success: true }
}

export async function deleteRecurringExpense(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)

    if (error) return { success: false, message: error.message }
    
    revalidatePath('/owner/financeiro')
    return { success: true }
}

export interface FinanceActionResult {
    success: boolean
    message?: string
    totalPaid?: number
    balance?: number
    status?: 'paid' | 'partial' | 'pending'
    transactions?: any[]
}

export async function getPaymentSummary(refId: string, refType: string, totalDue: number): Promise<FinanceActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: transactions, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('reference_id', refId)
            .eq('reference_type', refType)
            .eq('type', 'income')
            .order('date', { ascending: true })

        if (error) throw error

        const totalPaid = (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0)
        const balance = Math.max(0, totalDue - totalPaid)
        
        let status: 'paid' | 'partial' | 'pending' = 'pending'
        if (totalPaid >= totalDue && totalDue > 0) status = 'paid'
        else if (totalPaid > 0) status = 'partial'

        return {
            success: true,
            totalPaid,
            balance,
            status,
            transactions: transactions || []
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function registerReferencePayment(data: {
    refId: string,
    refType: string,
    amount: number,
    paymentMethod: string,
    date?: string,
    category?: string,
    description?: string,
    totalDue: number
}): Promise<FinanceActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        // 1. Inserir transação
        const { error: transError } = await supabase
            .from('financial_transactions')
            .insert({
                org_id: profile.org_id,
                type: 'income',
                category: data.category || 'Pagamento',
                amount: data.amount,
                description: data.description || `Pagamento parcial - ${data.refType}`,
                payment_method: data.paymentMethod,
                date: data.date || new Date().toISOString(),
                reference_id: data.refId,
                reference_type: data.refType,
                created_by: user.id
            })

        if (transError) throw transError

        // 2. Recalcular e atualizar status do pai
        const summary = await getPaymentSummary(data.refId, data.refType, data.totalDue)
        if (summary.success) {
            const tableMap: Record<string, string> = {
                'consultation': 'vet_consultations',
                'appointment': 'appointments',
                'package': 'customer_packages',
                'vaccine': 'pet_vaccines'
            }

            const tableName = tableMap[data.refType]
            if (tableName) {
                await supabase
                    .from(tableName)
                    .update({ 
                        payment_status: summary.status,
                        // Se for totalmente pago, podemos atualizar o payment_method principal também (opcional)
                        ...(summary.status === 'paid' ? { payment_method: data.paymentMethod } : {})
                    })
                    .eq('id', data.refId)
            }
        }

        revalidatePath('/owner/financeiro')
        revalidatePath('/owner/pets')
        revalidatePath('/owner/agenda')
        revalidatePath('/owner')
        
        return { success: true, message: 'Pagamento registrado com sucesso!' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function deleteReferencePayment(transactionId: string, refId: string, refType: string, totalDue: number): Promise<FinanceActionResult> {
    try {
        const supabase = await createClient()
        
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId)

        if (deleteError) throw deleteError

        // Recalcular status do pai
        const summary = await getPaymentSummary(refId, refType, totalDue)
        if (summary.success) {
            const tableMap: Record<string, string> = {
                'consultation': 'vet_consultations',
                'appointment': 'appointments',
                'package': 'customer_packages',
                'vaccine': 'pet_vaccines'
            }

            const tableName = tableMap[refType]
            if (tableName) {
                await supabase
                    .from(tableName)
                    .update({ payment_status: summary.status })
                    .eq('id', refId)
            }
        }

        revalidatePath('/owner/financeiro')
        revalidatePath('/owner')
        return { success: true, message: 'Pagamento removido.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}
