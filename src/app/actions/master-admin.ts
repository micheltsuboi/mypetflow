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
    revalidatePath('/master-admin/clientes')
    return { success: true }
}

// 3. Buscar Estatísticas Globais
export async function fetchGlobalStats() {
    const supabaseAdmin = createAdminClient()

    const { count: organizations } = await supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true })
    const { count: users } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
    const { count: pets } = await supabaseAdmin.from('pets').select('*', { count: 'exact', head: true })
    const { count: appointments } = await supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true })

    return {
        organizations: organizations || 0,
        users: users || 0,
        pets: pets || 0,
        appointments: appointments || 0,
        revenue: 0 // Placeholder para faturamento total se houver integração financeira global
    }
}

// 4. Criar Novo Tenant (Loja + Admin)
export async function createTenant(formData: FormData) {
    const supabaseAdmin = createAdminClient()

    const orgName = formData.get('orgName') as string
    const subdomain = formData.get('subdomain') as string
    const adminEmail = formData.get('adminEmail') as string
    const adminPassword = formData.get('adminPassword') as string
    const adminName = formData.get('adminName') as string

    // 1. Criar Organização
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
            name: orgName,
            subdomain: subdomain,
            is_active: true
        })
        .select()
        .single()

    if (orgError) {
        return { success: false, message: 'Erro ao criar organização: ' + orgError.message }
    }

    // 2. Criar Usuário Admin no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminName }
    })

    if (authError) {
        // Cleanup org se o user falhar
        await supabaseAdmin.from('organizations').delete().eq('id', org.id)
        return { success: false, message: 'Erro ao criar usuário admin: ' + authError.message }
    }

    // 3. Criar Perfil do Admin
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: authUser.user.id,
            full_name: adminName,
            role: 'admin',
            org_id: org.id,
            is_active: true
        })

    if (profileError) {
        return { success: false, message: 'Erro ao criar perfil: ' + profileError.message }
    }

    revalidatePath('/master-admin/clientes')
    return { success: true }
}
