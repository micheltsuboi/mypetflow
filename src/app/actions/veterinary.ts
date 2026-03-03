'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ==========================================
// VETERINARIANS
// ==========================================

export async function getVeterinarians() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return []

        const { data, error } = await supabase
            .from('veterinarians')
            .select('*')
            .eq('org_id', profile.org_id)
            .order('name')

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching veterinarians:', error)
        return []
    }
}

export async function createVeterinarian(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada.' }

        const name = formData.get('name') as string
        const crmv = formData.get('crmv') as string
        const specialty = formData.get('specialty') as string || null
        const phone = formData.get('phone') as string || null
        const email = formData.get('email') as string || null
        const consultation_base_price = parseFloat(formData.get('consultation_base_price') as string || '0')
        const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'
        const password = formData.get('password') as string || null

        if (!name || !crmv) return { success: false, message: 'Nome e CRMV são obrigatórios.' }

        let authUserId = null;

        // Create login if password is provided
        if (password && email) {
            const supabaseAdmin = createAdminClient()
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            })

            if (createError) {
                return { success: false, message: `Erro ao criar login: ${createError.message}` }
            }

            if (newUser?.user) {
                authUserId = newUser.user.id
                // Upsert profile for the new user (role: staff, permissions: clinica_vet)
                await supabaseAdmin.from('profiles').upsert({
                    id: authUserId,
                    email: email,
                    full_name: name,
                    role: 'staff',
                    org_id: profile.org_id,
                    permissions: ['clinica_vet', 'pets'], // basic permissions for vet
                    is_active: true
                })
            }
        } else if (password && !email) {
            return { success: false, message: 'Para criar login é necessário fornecer um email.' }
        }

        const insertData: any = {
            org_id: profile.org_id,
            name,
            crmv,
            specialty,
            phone,
            email,
            consultation_base_price,
            is_active
        }

        // Only add user_id if we created one, handling the migration column
        if (authUserId) {
            insertData.user_id = authUserId
        }

        const { error } = await supabase
            .from('veterinarians')
            .insert(insertData)

        if (error) {
            // Delete the auth user if veterinarian creation fails
            if (authUserId) {
                const supabaseAdmin = createAdminClient()
                await supabaseAdmin.auth.admin.deleteUser(authUserId)
            }
            throw error
        }

        revalidatePath('/owner/veterinary')
        return { success: true, message: 'Veterinário cadastrado com sucesso.' }
    } catch (error: any) {
        console.error('Error creating veterinarian:', error)
        return { success: false, message: error.message || 'Erro ao cadastrar veterinário.' }
    }
}

export async function updateVeterinarian(formData: FormData) {
    try {
        const supabase = await createClient()
        const id = formData.get('id') as string
        const name = formData.get('name') as string
        const crmv = formData.get('crmv') as string
        const specialty = formData.get('specialty') as string || null
        const phone = formData.get('phone') as string || null
        const email = formData.get('email') as string || null
        const consultation_base_price = parseFloat(formData.get('consultation_base_price') as string || '0')
        const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'

        if (!id || !name || !crmv) return { success: false, message: 'Dados inválidos.' }

        const { error } = await supabase
            .from('veterinarians')
            .update({
                name,
                crmv,
                specialty,
                phone,
                email,
                consultation_base_price,
                is_active
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/owner/veterinary')
        return { success: true, message: 'Veterinário atualizado com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message || 'Erro ao atualizar veterinário.' }
    }
}

// ==========================================
// VET CONSULTATIONS
// ==========================================

export async function getVetConsultations(petId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vet_consultations')
            .select(`
                *,
                veterinarians:veterinarian_id(name, crmv)
            `)
            .eq('pet_id', petId)
            .order('consultation_date', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching consultations:', error)
        return []
    }
}

export async function createVetConsultation(formData: FormData) {
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

        const pet_id = formData.get('pet_id') as string
        const veterinarian_id = formData.get('veterinarian_id') as string || null
        const consultation_date = formData.get('consultation_date') as string || new Date().toISOString()
        const reason = formData.get('reason') as string || null
        const diagnosis = formData.get('diagnosis') as string || null
        const treatment = formData.get('treatment') as string || null
        const prescription = formData.get('prescription') as string || null
        const notes = formData.get('notes') as string || null

        const consultation_fee = parseFloat(formData.get('consultation_fee') as string || '0')
        const discount_percent = parseFloat(formData.get('discount_percent') as string || '0')
        const payment_status = formData.get('payment_status') as string || 'pending'
        const payment_method = formData.get('payment_method') as string || 'cash'

        if (!pet_id) return { success: false, message: 'Pet não informado.' }

        const { error } = await supabase
            .from('vet_consultations')
            .insert({
                org_id: profile.org_id,
                pet_id,
                veterinarian_id,
                consultation_date,
                reason,
                diagnosis,
                treatment,
                prescription,
                notes,
                consultation_fee,
                discount_percent,
                payment_status,
                payment_method,
                created_by: user.id
            })

        if (error) throw error

        // Registra transação financeira se já estiver pago
        if (payment_status === 'paid' && consultation_fee > 0) {
            const finalTotal = consultation_fee - (consultation_fee * (discount_percent / 100));
            // Call financial transaction if necessary, or just rely on the user doing it via finance module.
            // Ideally should register income:
            await supabase.from('financial_transactions').insert({
                org_id: profile.org_id,
                type: 'income',
                category: 'Consulta Veterinária',
                amount: finalTotal,
                description: `Consulta Vet (${payment_method}) - Pet: ${pet_id}`,
                payment_method,
                created_by: user.id,
                date: new Date().toISOString()
            });
        }

        revalidatePath('/owner/pets')
        return { success: true, message: 'Consulta registrada com sucesso.' }
    } catch (error: any) {
        console.error('Error creating consultation:', error)
        return { success: false, message: error.message || 'Erro inesperado' }
    }
}

export async function updateVetConsultation(formData: FormData) {
    try {
        const supabase = await createClient()
        const id = formData.get('id') as string
        if (!id) return { success: false, message: 'ID não informado' }

        const veterinarian_id = formData.get('veterinarian_id') as string || null
        const consultation_date = formData.get('consultation_date') as string
        const reason = formData.get('reason') as string || null
        const diagnosis = formData.get('diagnosis') as string || null
        const treatment = formData.get('treatment') as string || null
        const prescription = formData.get('prescription') as string || null
        const notes = formData.get('notes') as string || null
        const consultation_fee = parseFloat(formData.get('consultation_fee') as string || '0')
        const discount_percent = parseFloat(formData.get('discount_percent') as string || '0')
        const payment_status = formData.get('payment_status') as string
        const payment_method = formData.get('payment_method') as string

        const { error } = await supabase
            .from('vet_consultations')
            .update({
                veterinarian_id,
                consultation_date,
                reason,
                diagnosis,
                treatment,
                prescription,
                notes,
                consultation_fee,
                discount_percent,
                payment_status,
                payment_method
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/owner/pets')
        return { success: true, message: 'Consulta atualizada com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function updateConsultationPayment(id: string, obj: { payment_status: 'paid' | 'pending' }) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vet_consultations')
            .update({ payment_status: obj.payment_status })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/owner/pets')
        return { success: true, message: 'Status atualizado com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message || 'Erro ao atualizar.' }
    }
}


// ==========================================
// VET RECORDS (Prontuários)
// ==========================================

export async function getVetRecords(petId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vet_records')
            .select(`
                *,
                veterinarians:veterinarian_id(name)
            `)
            .eq('pet_id', petId)
            .order('record_date', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        return []
    }
}

export async function createVetRecord(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        const pet_id = formData.get('pet_id') as string
        const veterinarian_id = formData.get('veterinarian_id') as string || null
        const consultation_id = formData.get('consultation_id') as string || null
        const record_date = formData.get('record_date') as string || new Date().toISOString()
        const title = formData.get('title') as string
        const content = formData.get('content') as string

        if (!pet_id || !title || !content) return { success: false, message: 'Preencha os campos obrigatórios.' }

        const { error } = await supabase
            .from('vet_records')
            .insert({
                org_id: profile?.org_id,
                pet_id,
                veterinarian_id,
                consultation_id,
                record_date,
                title,
                content,
                created_by: user.id
            })

        if (error) throw error
        revalidatePath('/owner/pets')
        return { success: true, message: 'Prontuário salvo.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}


// ==========================================
// VET EXAMS & TYPES
// ==========================================

export async function getVetExamTypes() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return []

        const { data, error } = await supabase
            .from('vet_exam_types')
            .select('*')
            .eq('org_id', profile.org_id)
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data || []
    } catch (error) {
        return []
    }
}

export async function createVetExamType(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

        const name = formData.get('name') as string
        const base_price = parseFloat(formData.get('base_price') as string || '0')
        const description = formData.get('description') as string || null

        if (!name) return { success: false, message: 'Nome obrigatório' }

        const { error } = await supabase.from('vet_exam_types').insert({
            org_id: profile?.org_id,
            name,
            base_price,
            description,
            is_active: true
        })

        if (error) throw error
        revalidatePath('/owner/veterinary')
        return { success: true, message: 'Tipo de exame cadastrado.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function deleteVetExamType(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase.from('vet_exam_types').update({ is_active: false }).eq('id', id)
        if (error) throw error
        revalidatePath('/owner/veterinary')
        return { success: true, message: 'Desativado.' }
    } catch (error) {
        return { success: false, message: 'Erro ao desativar.' }
    }
}

export async function getVetExams(petId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vet_exams')
            .select(`
                *,
                veterinarians:veterinarian_id(name)
            `)
            .eq('pet_id', petId)
            .order('exam_date', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        return []
    }
}

export async function createVetExam(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

        const pet_id = formData.get('pet_id') as string
        const veterinarian_id = formData.get('veterinarian_id') as string || null
        const exam_type_id = formData.get('exam_type_id') as string || null
        const exam_type_name = formData.get('exam_type_name') as string
        const exam_date = formData.get('exam_date') as string || new Date().toISOString()
        const result_notes = formData.get('result_notes') as string || null

        const price = parseFloat(formData.get('price') as string || '0')
        const discount_percent = parseFloat(formData.get('discount_percent') as string || '0')
        const payment_status = formData.get('payment_status') as string || 'pending'
        const payment_method = formData.get('payment_method') as string || 'cash'

        // Handle file upload manually before coming here, or here if simple
        const file_url = formData.get('file_url') as string || null

        if (!pet_id || !exam_type_name) return { success: false, message: 'Campos obrigatórios faltando.' }

        const { error } = await supabase
            .from('vet_exams')
            .insert({
                org_id: profile?.org_id,
                pet_id,
                veterinarian_id,
                exam_type_id,
                exam_type_name,
                exam_date,
                result_notes,
                file_url,
                price,
                discount_percent,
                payment_status,
                payment_method,
                created_by: user.id
            })

        if (error) throw error

        if (payment_status === 'paid' && price > 0) {
            const finalTotal = price - (price * (discount_percent / 100));
            await supabase.from('financial_transactions').insert({
                org_id: profile?.org_id,
                type: 'income',
                category: 'Exame Veterinário',
                amount: finalTotal,
                description: `Exame (${exam_type_name}) [${payment_method}] - Pet: ${pet_id}`,
                payment_method,
                created_by: user.id,
                date: new Date().toISOString()
            });
        }

        revalidatePath('/owner/pets')
        return { success: true, message: 'Exame registrado com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function updateExamPayment(id: string, obj: { payment_status: 'paid' | 'pending' }) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vet_exams')
            .update({ payment_status: obj.payment_status })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/owner/pets')
        return { success: true, message: 'Status atualizado com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message || 'Erro ao atualizar.' }
    }
}

export async function deleteVetExam(id: string) {
    try {
        const supabase = await createClient()
        // could try to delete file here too, but simple DB deletion is first step
        const { error } = await supabase.from('vet_exams').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/owner/pets')
        return { success: true, message: 'Exame removido com sucesso.' }
    } catch (error: any) {
        return { success: false, message: 'Erro ao remover exame.' }
    }
}
