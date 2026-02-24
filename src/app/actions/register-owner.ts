'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface RegisterOwnerState {
    message: string
    success: boolean
}

export async function registerOwner(prevState: RegisterOwnerState, formData: FormData) {
    const orgName = formData.get('orgName') as string
    let subdomain = formData.get('subdomain') as string
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string

    if (!orgName || !subdomain || !fullName || !email || !password || !phone) {
        return { message: 'Todos os campos são obrigatórios.', success: false }
    }

    // Normalizar subdomínio: minúsculas, sem espaços, sem caracteres especiais
    subdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')

    if (subdomain.length < 3) {
        return { message: 'O subdomínio deve ter pelo menos 3 caracteres.', success: false }
    }

    const supabaseAdmin = createAdminClient()

    // 1. Verificar se o subdomínio já existe
    const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('subdomain', subdomain)
        .single()

    if (existingOrg) {
        return { message: 'Este subdomínio já está em uso.', success: false }
    }

    // 2. Criar a Organização
    const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
            name: orgName,
            subdomain: subdomain,
            is_active: true
        })
        .select()
        .single()

    if (orgError || !newOrg) {
        console.error('Erro ao criar organização:', orgError)
        return { message: 'Erro ao criar a empresa.', success: false }
    }

    // 3. Criar o Usuário no Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: phone }
    })

    if (createError) {
        // Rollback da organização
        await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id)
        return { message: `Erro ao criar conta: ${createError.message}`, success: false }
    }

    if (!newUser.user) {
        await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id)
        return { message: 'Erro inesperado ao criar usuário.', success: false }
    }

    // 4. Atualizar Profile gerado pela trigger: setar como admin vinculado à nova org
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            role: 'admin',
            org_id: newOrg.id,
            full_name: fullName,
            email: email,
            phone: phone
        })

    if (profileError) {
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id)
        return { message: `Erro ao configurar perfil: ${profileError.message}`, success: false }
    }

    // Success
    return { message: 'Empresa cadastrada com sucesso! Faça login para acessar o painel.', success: true }
}
