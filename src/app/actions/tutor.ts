'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface CreateTutorState {
    message: string
    success: boolean
}

export async function createTutor(prevState: CreateTutorState, formData: FormData) {
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

    if (!profile || !['superadmin', 'admin', 'staff'].includes(profile.role)) {
        return { message: 'Permissão negada. Apenas staff e administradores podem cadastrar tutores.', success: false }
    }

    // 2. Extract Data
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const phone = formData.get('phone') as string
    const birthDate = formData.get('birthDate') as string
    const address = formData.get('address') as string
    const neighborhood = formData.get('neighborhood') as string
    const city = formData.get('city') as string
    const instagram = formData.get('instagram') as string
    const cpf_cnpj = formData.get('cpf_cnpj') as string
    const physical_file_number = formData.get('physical_file_number') as string

    if (!name || !phone) {
        return { message: 'Nome e Telefone são obrigatórios.', success: false }
    }

    let authUserId: string | null = null;
    const supabaseAdmin = createAdminClient()

    // 3. Create User with Admin Client ONLY if email AND password are provided
    if (email && password) {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm email for immediate login
            user_metadata: { full_name: name, phone: phone }
        })

        if (createError) {
            return { message: `Erro ao criar acesso do portal: ${createError.message}`, success: false }
        }

        if (newUser.user) {
            authUserId = newUser.user.id

            // 4. Update Profile (created by trigger)
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    role: 'customer',
                    phone: phone,
                    full_name: name
                })
                .eq('id', authUserId)

            if (profileError) {
                // Rollback user creation
                await supabaseAdmin.auth.admin.deleteUser(authUserId)
                return { message: `Erro ao inicializar perfil do tutor: ${profileError.message}`, success: false }
            }
        }
    }

    // 5. Create Customer Record
    // 5. Create Customer Record
    const customerData: Record<string, string | null> = {
        user_id: authUserId,
        org_id: profile.org_id,
        name: name,
        email: email || null,
        phone_1: phone,
        address: address || null,
        neighborhood: neighborhood || null,
        city: city || '',
        instagram: instagram || null,
        cpf_cnpj: cpf_cnpj || null,
        physical_file_number: physical_file_number || null,
    }

    if (birthDate) {
        customerData.birth_date = birthDate
    }

    const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert(customerData)

    if (customerError) {
        // Rollback user creation if it was created
        if (authUserId) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId)
        }
        return { message: `Erro ao criar ficha do tutor: ${customerError.message}`, success: false }
    }

    revalidatePath('/owner/tutors')
    return { message: 'Tutor cadastrado com sucesso!', success: true }
}

export async function updateTutor(prevState: CreateTutorState, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const supabaseAdmin = createAdminClient()

    // Extract Data
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string // Optional
    const phone = formData.get('phone') as string
    const birthDate = formData.get('birthDate') as string
    const address = formData.get('address') as string
    const neighborhood = formData.get('neighborhood') as string
    const city = formData.get('city') as string
    const instagram = formData.get('instagram') as string
    const cpf_cnpj = formData.get('cpf_cnpj') as string
    const physical_file_number = formData.get('physical_file_number') as string

    if (!id) return { message: 'ID do tutor não fornecido.', success: false }

    // 1. Get current tutor data to check user_id
    const { data: currentTutor } = await supabaseAdmin
        .from('customers')
        .select('user_id, email')
        .eq('id', id)
        .single()

    let userId = currentTutor?.user_id

    // 2. Handle Portal Access / Password
    if (password) {
        // To create or update an Auth user, we need an email. 
        // If not provided in form, use current email from record.
        const effectiveEmail = email || currentTutor?.email

        if (!userId) {
            if (effectiveEmail) {
                // Create NEW Auth User for existing customer
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: effectiveEmail,
                    password,
                    email_confirm: true,
                    user_metadata: { full_name: name, phone: phone }
                })

                if (createError) {
                    return { message: `Erro ao criar acesso: ${createError.message}`, success: false }
                }

                userId = newUser.user?.id

                // Sync Profile
                if (userId) {
                    await supabaseAdmin.from('profiles').update({
                        role: 'customer',
                        phone: phone,
                        full_name: name,
                        org_id: (await supabase.from('profiles').select('org_id').eq('id', user.id).single()).data?.org_id
                    }).eq('id', userId)
                }
            } else {
                return { message: 'Para criar acesso ao portal, é necessário informar um e-mail.', success: false }
            }
        } else {
            // Update existing user password
            const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: password,
                email: email || undefined // Update email if provided
            })
            if (pwdError) {
                return { message: `Erro ao atualizar senha/acesso: ${pwdError.message}`, success: false }
            }
        }
    }

    // 3. Update Customer Record
    const customerData: Record<string, string | null> = {
        name,
        email,
        phone_1: phone,
        address: address || null,
        neighborhood: neighborhood || null,
        city: city || '',
        instagram: instagram || null,
        cpf_cnpj: cpf_cnpj || null,
        physical_file_number: physical_file_number || null,
        user_id: userId || currentTutor?.user_id // Keep or link new userId
    }

    if (birthDate) customerData.birth_date = birthDate

    const { error } = await supabaseAdmin
        .from('customers')
        .update(customerData)
        .eq('id', id)

    if (error) {
        return { message: `Erro ao atualizar tutor: ${error.message}`, success: false }
    }

    // Sync Profile name/phone if connected
    if (userId) {
        await supabaseAdmin.from('profiles').update({
            full_name: name,
            phone: phone,
            email: email
        }).eq('id', userId)
    }

    revalidatePath('/owner/tutors')
    return { message: 'Tutor atualizado com sucesso!', success: true }
}

export async function deleteTutor(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const supabaseAdmin = createAdminClient()

    // Get user_id before deleting to clean up Auth user if desired
    // For now, we only delete the Customer card. Deleting Auth User is risky if they have other access.
    // But since "Tutor" is usually a role, maybe we should? 
    // Let's stick to deleting the business record 'customers'. RLS rules will handle visibility.

    const { error } = await supabaseAdmin
        .from('customers')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Erro ao excluir tutor:', error)
        return { message: `Erro ao excluir: ${error.message}`, success: false }
    }

    revalidatePath('/owner/tutors')
    return { message: 'Tutor excluído com sucesso!', success: true }
}

export async function searchTutors(query: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const { data, error } = await supabase
            .from('customers')
            .select('id, name, phone_1, physical_file_number')
            .eq('org_id', profile.org_id)
            .ilike('name', `%${query}%`)
            .limit(10)

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error searching tutors:', error)
        return { success: false, message: 'Erro ao buscar tutores' }
    }
}
