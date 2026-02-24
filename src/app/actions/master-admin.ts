'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface OrganizationData {
    id: string
    name: string
    subdomain: string
    is_active: boolean
    created_at: string
    total_users: number
}

// 1. Fetch Todas as Organizações
export async function fetchOrganizations(): Promise<OrganizationData[]> {
    const supabaseAdmin = createAdminClient()

    const { data: orgs, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            subdomain,
            is_active,
            created_at,
            profiles ( count )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar organizações:', error)
        return []
    }

    // O retorno de profiles vem como array de objetos {count: number} quando usamos ( count )
    // Precisamos formatar o objeto pro client
    return orgs.map(org => ({
        id: org.id,
        name: org.name,
        subdomain: org.subdomain,
        is_active: org.is_active,
        created_at: org.created_at,
        total_users: Array.isArray(org.profiles) ? org.profiles[0]?.count || 0 : 0
    }))
}

// 2. Ativar/Desativar Organização
export async function toggleOrganizationStatus(orgId: string, currentStatus: boolean) {
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
        .from('organizations')
        .update({ is_active: !currentStatus })
        .eq('id', orgId)

    if (error) {
        console.error('Erro ao alternar status da organização:', error)
        return { success: false, message: 'Erro ao atualizar o status.' }
    }

    revalidatePath('/master-admin')
    return { success: true }
}
