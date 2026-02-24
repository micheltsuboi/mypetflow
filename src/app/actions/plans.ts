'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface SaasPlan {
    id: string
    name: string
    description: string
    price: number
    features: string[]
    is_active: boolean
    created_at: string
}

export async function fetchPlans(): Promise<SaasPlan[]> {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
        .from('saas_plans')
        .select('*')
        .order('name')

    if (error) {
        console.error('Erro ao buscar planos:', error)
        return []
    }
    return data || []
}

export async function createPlan(formData: FormData) {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const priceStr = formData.get('price') as string
    const price = priceStr ? parseFloat(priceStr) : 0

    // O formData virá com vários checkboxes marcados com name="features"
    const features = formData.getAll('features') as string[]

    if (!name) return { success: false, message: 'Nome do plano é obrigatório.' }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('saas_plans')
        .insert({
            name,
            description,
            price,
            features,
            is_active: true
        })

    if (error) {
        return { success: false, message: 'Erro ao criar plano: ' + error.message }
    }

    revalidatePath('/master-admin/planos')
    // Atualizar clientes se houver necessidade
    return { success: true }
}

export async function updatePlan(id: string, formData: FormData) {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const priceStr = formData.get('price') as string
    const price = priceStr ? parseFloat(priceStr) : 0

    const features = formData.getAll('features') as string[]

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('saas_plans')
        .update({
            name,
            description,
            price,
            features
        })
        .eq('id', id)

    if (error) {
        return { success: false, message: 'Erro ao atualizar plano: ' + error.message }
    }

    revalidatePath('/master-admin/planos')
    // Se mudarmos features de um plano, todas as empresas atreladas a ele precisam ver as mudanças
    // O Next.js cache pode precisar ser revalidado para todo mundo
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function togglePlanStatus(id: string, currentStatus: boolean) {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
        .from('saas_plans')
        .update({ is_active: !currentStatus })
        .eq('id', id)

    if (error) return { success: false, message: 'Erro ao alterar status.' }

    revalidatePath('/master-admin/planos')
    return { success: true }
}
