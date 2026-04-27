'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface CreateUserState {
    message: string
    success: boolean
}

export async function createUser(prevState: CreateUserState, formData: FormData) {
    const supabase = await createClient()

    // 1. Verify Authentication & Authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { message: 'Não autorizado. Faça login primeiro.', success: false }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['superadmin', 'admin'].includes(profile.role)) {
        return { message: 'Permissão negada. Apenas administradores podem criar usuários.', success: false }
    }

    // 2. Extract Data
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string
    const workScheduleStr = formData.get('workSchedule') as string
    const permissionsStr = formData.get('permissions') as string
    const crmv = formData.get('crmv') as string
    const specialty = formData.get('specialty') as string || null

    if (!email || !password || !fullName || !role) {
        return { message: 'Todos os campos são obrigatórios.', success: false }
    }

    let workSchedule = []
    let permissions = []
    if (role === 'staff') {
        try {
            if (workScheduleStr) workSchedule = JSON.parse(workScheduleStr)
            if (permissionsStr) permissions = JSON.parse(permissionsStr)
        } catch (e) {
            return { message: 'Formato de horário ou permissões inválido.', success: false }
        }
    } else {
        workSchedule = [] // Not a staff member, no schedule needed
        permissions = []
    }

    // 3. Create User with Admin Client
    const supabaseAdmin = createAdminClient()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm email
        user_metadata: { full_name: fullName }
    })

    if (createError) {
        return { message: `Erro ao criar usuário: ${createError.message}`, success: false }
    }

    if (!newUser.user) {
        return { message: 'Erro inesperado ao criar usuário via Admin API.', success: false }
    }

    // 4. Update Profile with correct Role and Org ID
    // Note: The trigger might have created a profile already, so we should update it
    // Or if we need to insert manually if the trigger isn't set up for admin.createUser
    // Let's try update first, insert if not exists (upsert)

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            email: email,
            full_name: fullName,
            role: role as 'admin' | 'staff' | 'customer',
            org_id: profile.org_id,
            work_schedule: workSchedule,
            permissions: permissions,
            is_active: true
        })

    if (profileError) {
        // Rollback user creation if profile fails (optional but good practice)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return { message: `Erro ao criar perfil do usuário: ${profileError.message}`, success: false }
    }

    // 5. Handle Veterinarian Profile
    if (crmv) {
        const { error: vetError } = await supabaseAdmin
            .from('veterinarians')
            .insert({
                org_id: profile.org_id,
                user_id: newUser.user.id,
                name: fullName,
                crmv,
                specialty,
                email,
                is_active: true
            })
        
        if (vetError) {
            console.error('Error creating vet profile:', vetError)
            // We don't roll back the whole user, just inform or log
        }
    }

    revalidatePath('/owner/usuarios')
    return { message: 'Usuário criado com sucesso!', success: true }
}

export async function updateUser(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // 1. Verify Authentication & Authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { message: 'Não autorizado. Faça login primeiro.', success: false }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['superadmin', 'admin'].includes(profile.role)) {
        return { message: 'Permissão negada. Apenas administradores podem gerenciar usuários.', success: false }
    }

    // 2. Extract Data
    const userId = formData.get('userId') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string
    const workScheduleStr = formData.get('workSchedule') as string
    const permissionsStr = formData.get('permissions') as string
    const isActive = formData.get('isActive') === 'true'
    const crmv = formData.get('crmv') as string
    const specialty = formData.get('specialty') as string || null

    if (!userId || !fullName || !role) {
        return { message: 'Campos obrigatórios faltando.', success: false }
    }

    let workSchedule: any = null
    let permissions: any = null
    try {
        if (workScheduleStr) workSchedule = JSON.parse(workScheduleStr)
        if (permissionsStr) permissions = JSON.parse(permissionsStr)
    } catch (e) {
        return { message: 'Formato de horário ou permissões inválido.', success: false }
    }

    // 3. Update Profile with Admin Client
    const supabaseAdmin = createAdminClient()

    const updateData: any = {
        full_name: fullName,
        role: role as 'admin' | 'staff' | 'customer',
        is_active: isActive
    }

    if (role === 'staff' && workSchedule !== null) {
        updateData.work_schedule = workSchedule
    } else if (role !== 'staff') {
        updateData.work_schedule = [] // Clear schedule for non-staff
    }

    if (role === 'staff' && permissions !== null) {
        updateData.permissions = permissions
    } else if (role !== 'staff') {
        updateData.permissions = []
    }

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .eq('org_id', profile.org_id) // Ensure we only update users in the same org

    if (updateError) {
        return { message: `Erro ao atualizar usuário: ${updateError.message}`, success: false }
    }

    // 4. Handle Veterinarian Profile
    // If formData has 'crmv', it means we are editing the profile form, not just toggling status
    if (formData.has('crmv')) {
        if (crmv) {
            // Check if exists
            const { data: existingVet } = await supabaseAdmin
                .from('veterinarians')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (existingVet) {
                const { error: vetError } = await supabaseAdmin
                    .from('veterinarians')
                    .update({
                        name: fullName,
                        crmv,
                        specialty,
                        is_active: isActive
                    })
                    .eq('id', existingVet.id)
                    
                if (vetError) console.error('Error updating vet profile:', vetError)
            } else {
                const { error: vetError } = await supabaseAdmin
                    .from('veterinarians')
                    .insert({
                        org_id: profile.org_id,
                        user_id: userId,
                        name: fullName,
                        crmv,
                        specialty,
                        is_active: isActive
                    })
                    
                if (vetError) console.error('Error creating vet profile:', vetError)
            }
        } else {
            // If CRMV was explicitly cleared in the form
            // Soft delete or deactivate the veterinarian profile
            const { data: existingVet } = await supabaseAdmin
                .from('veterinarians')
                .select('id')
                .eq('user_id', userId)
                .single()
                
            if (existingVet) {
                await supabaseAdmin
                    .from('veterinarians')
                    .update({ is_active: false })
                    .eq('id', existingVet.id)
            }
        }
    }

    revalidatePath('/owner/usuarios')
    return { message: 'Usuário atualizado com sucesso!', success: true }
}
