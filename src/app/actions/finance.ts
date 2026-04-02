'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getExpenseCategories() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('name', { ascending: true })

    return data || []
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
