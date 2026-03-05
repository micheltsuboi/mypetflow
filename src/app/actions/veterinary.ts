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

export async function deleteVetConsultation(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vet_consultations')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath('/owner/pets')
        return { success: true, message: 'Consulta excluída com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message || 'Erro ao excluir consulta.' }
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

// ==========================================
// VET DASHBOARD / LISTING
// ==========================================

export async function getVetDashboardAppointments() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
        if (!profile?.org_id) return []

        // Fetch category ID for Clínica Veterinária
        const { data: category } = await supabase.from('service_categories').select('id').eq('name', 'Clínica Veterinária').single()
        if (!category) return []

        let query = supabase
            .from('appointments')
            .select(`
                *,
                pets (id, name, species, breed, customers (name)),
                services (id, name, base_price)
            `)
            .eq('service_category_id', category.id)
            .eq('org_id', profile.org_id)
            .neq('status', 'cancelled')

        // Limiting date bounds to decrease query payload and improve DB speed
        const now = new Date()
        const cutOffPast = new Date(now)
        cutOffPast.setDate(now.getDate() - 45)
        const cutOffFuture = new Date(now)
        cutOffFuture.setDate(now.getDate() + 45)

        query = query.gte('scheduled_at', cutOffPast.toISOString())
        query = query.lte('scheduled_at', cutOffFuture.toISOString())
        query = query.order('scheduled_at', { ascending: true })

        const { data, error } = await query
        if (error) throw error

        // Also fetch any existing consultations for these appointments to know which ones are "Iniciadas"
        const apptIds = data?.map(d => d.id) || []
        const { data: consultations } = await supabase
            .from('vet_consultations')
            .select('id, appointment_id')
            .in('appointment_id', apptIds)

        const apptsWithConsultation = data?.map(appt => ({
            ...appt,
            has_consultation: consultations?.some(c => c.appointment_id === appt.id),
            consultation_id: consultations?.find(c => c.appointment_id === appt.id)?.id
        }))

        return apptsWithConsultation || []
    } catch (error) {
        console.error('Error fetching vet dashboard appointments:', error)
        return []
    }
}

export async function autosaveVetConsultation(id: string, field: string, value: any) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vet_consultations')
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function startConsultation(appointmentId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        // Fetch appointment details
        const { data: appt, error: apptError } = await supabase
            .from('appointments')
            .select(`
                *,
                pets (id, name),
                services (id, name, base_price)
            `)
            .eq('id', appointmentId)
            .single()

        if (apptError || !appt) return { success: false, message: 'Agendamento não encontrado' }

        // Fetch organization
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

        // Fetch current veterinarian account for this user
        const { data: vet } = await supabase
            .from('veterinarians')
            .select('id')
            .eq('user_id', user.id)
            .single()

        // Check if consultation record already exists for this appointment
        const { data: existing } = await supabase
            .from('vet_consultations')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

        if (existing) {
            return { success: true, data: existing }
        }

        // Create new consultation record
        const { data: newConsultation, error: insertError } = await supabase
            .from('vet_consultations')
            .insert({
                org_id: profile.org_id,
                pet_id: appt.pet_id,
                veterinarian_id: vet?.id || null,
                appointment_id: appointmentId,
                consultation_date: appt.scheduled_at,
                reason: appt.notes || appt.services?.name,
                consultation_fee: appt.final_price || appt.calculated_price || 0,
                payment_status: appt.payment_status || 'pending',
                payment_method: appt.payment_method || 'cash',
                created_by: user.id
            })
            .select()
            .single()

        if (insertError) throw insertError

        // Update appointment status to in_progress if it was confirmed/pending
        if (appt.status !== 'in_progress' && appt.status !== 'done') {
            await supabase.from('appointments').update({ status: 'in_progress', actual_check_in: new Date().toISOString() }).eq('id', appointmentId)
        }

        return { success: true, data: newConsultation }
    } catch (error: any) {
        console.error('Error starting consultation:', error)
        return { success: false, message: error.message }
    }
}

export async function finishVetConsultation(appointmentId: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('appointments')
            .update({
                status: 'done',
                actual_check_out: new Date().toISOString()
            })
            .eq('id', appointmentId)

        if (error) throw error
        return { success: true, message: 'Consulta finalizada com sucesso!' }
    } catch (error: any) {
        console.error('Error finishing consultation:', error)
        return { success: false, message: error.message }
    }
}

export async function createBlankConsultation(petId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const { data: vet } = await supabase.from('veterinarians').select('id').eq('user_id', user.id).single()

        const { data, error } = await supabase
            .from('vet_consultations')
            .insert({
                org_id: profile.org_id,
                pet_id: petId,
                veterinarian_id: vet?.id || null,
                consultation_date: new Date().toISOString(),
                payment_status: 'pending',
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

// ==========================================
// VET ALERTS (Integração Operacional)
// ==========================================

export async function createVetAlert({
    petId,
    appointmentId,
    observation
}: {
    petId: string,
    appointmentId?: string,
    observation: string
}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id, full_name').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        // Fetch Pet Details for Notification
        const { data: pet } = await supabase
            .from('pets')
            .select('name, customers(name, phone)')
            .eq('id', petId)
            .single()

        // 1. Insert alert in database
        const { data: alert, error } = await supabase
            .from('vet_alerts')
            .insert({
                org_id: profile.org_id,
                pet_id: petId,
                appointment_id: appointmentId || null,
                observation,
                status: 'pending',
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        // 2. Trigger N8N Webhook directly for Tutor Notification
        try {
            const n8nBaseUrl = process.env.N8N_BASE_URL
            if (n8nBaseUrl) {
                const petName = pet?.name || 'seu pet'
                const tutorName = (pet?.customers as any)?.name || 'Cliente'
                let phone = (pet?.customers as any)?.phone || ''
                phone = phone.replace(/\D/g, '')
                if (phone && !phone.startsWith('55')) phone = '55' + phone

                // Format message suggesting scheduling
                const message = `Olá, ${tutorName}! 🐾\nNossa equipe de atendimento notou algo importante durante a visita do ${petName}: "${observation}".\n\nNossa equipe veterinária já foi sinalizada. Gostaria de agendar uma consulta para o(a) ${petName} ou falar com um de nossos especialistas?`

                const n8nUrlObj = new URL(`${n8nBaseUrl}/webhook/vet-alert`)
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }

                if (n8nUrlObj.username && n8nUrlObj.password) {
                    const encodedAuth = btoa(`${n8nUrlObj.username}:${n8nUrlObj.password}`)
                    headers['Authorization'] = `Basic ${encodedAuth}`
                    n8nUrlObj.username = ''
                    n8nUrlObj.password = ''
                }

                // Await the fetch so Next.js doesn't kill the function early
                console.log('Disparando Webhook N8N para:', n8nUrlObj.toString())
                const n8nRes = await fetch(n8nUrlObj.toString(), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        phone: phone,
                        message: message,
                        tenant_id: profile.org_id,
                        pet_name: petName,
                        type: 'vet_alert_suggestion'
                    })
                })
                console.log('Resposta N8N Status:', n8nRes.status)
            }
        } catch (n8nError) {
            console.error('Falha ao acionar webhook n8n:', n8nError)
            // non-blocking for DB insertion
        }

        revalidatePath('/owner/consultas') // Refresh vet dashboard
        return { success: true, message: 'Alerta enviado para a equipe veterinária!', data: alert }

    } catch (error: any) {
        console.error('Error creating vet alert:', error)
        return { success: false, message: error.message }
    }
}

export async function getPendingVetAlerts() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const adminSupabase = await createAdminClient()
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return []

        const { data, error } = await adminSupabase
            .from('vet_alerts')
            .select(`
                id, observation, status, created_at,
                pets ( id, name, species, breed, customers(name) )
            `)
            .eq('org_id', profile.org_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Erro Supabase ao buscar alertas vet:", error)
            throw error
        }
        console.log('Alertas encontrados:', data?.length)
        return data || []
    } catch (error) {
        console.error('Error fetching pending vet alerts:', error)
        return []
    }
}

export async function getVetAlertsByPet(petId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vet_alerts')
            .select(`
                id, observation, status, created_at,
                pets ( id, name, species, breed, customers(name) )
            `)
            .eq('pet_id', petId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching vet alerts by pet:', error)
        return []
    }
}

export async function getVetAlertsByAppointment(appointmentId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vet_alerts')
            .select(`
                id, observation, status, created_at
            `)
            .eq('appointment_id', appointmentId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching vet alerts by appt:', error)
        return []
    }
}

export async function updateVetAlertStatus(alertId: string, status: 'pending' | 'read' | 'scheduled') {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vet_alerts')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', alertId)

        if (error) throw error

        revalidatePath('/owner/consultas')
        return { success: true, message: 'Status do alerta atualizado!' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}
