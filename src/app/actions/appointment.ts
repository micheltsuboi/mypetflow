'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

interface CreateAppointmentState {
    message: string
    success: boolean
}

export async function createAppointment(prevState: CreateAppointmentState, formData: FormData) {
    console.log('[createAppointment] Action started at', new Date().toISOString())
    try {
        const supabase = await createClient()

        // 1. Auth Check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.error('[createAppointment] No user found')
            return { message: 'Não autorizado.', success: false }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) {
            console.error('[createAppointment] Profile/Org not found:', user.id)
            return { message: 'Organização não encontrada.', success: false }
        }

        const isCustomer = profile.role === 'customer'

        // 2. Extract Data
        const petId = formData.get('petId') as string
        const serviceId = formData.get('serviceId') as string
        const date = formData.get('date') as string
        const time = formData.get('time') as string
        const notes = formData.get('notes') as string
        const staffId = formData.get('staffId') as string // Optional

        // Hospedagem Specifics
        const checkInDate = formData.get('checkInDate') as string
        const checkOutDate = formData.get('checkOutDate') as string

        console.log('[createAppointment] Inputs:', { petId, serviceId, date, time, checkInDate, checkOutDate })

        if (!petId || !serviceId) {
            return { message: 'Preencha todos os campos obrigatórios.', success: false }
        }

        // validate date/time only if NOT Hospedagem or if single day
        if ((!date || !time) && (!checkInDate || !checkOutDate)) {
            return { message: 'Selecione a data ou período.', success: false }
        }

        // Get Service & Category
        const { data: serviceData } = await supabase
            .from('services')
            .select(`
                id, 
                name,
                duration_minutes, 
                base_price,
                category_id,
                checklist_template,
                service_categories (id, name)
            `)
            .eq('id', serviceId)
            .single()

        if (!serviceData) {
            console.error('[createAppointment] Service not found:', serviceId)
            return { message: 'Serviço não encontrado.', success: false }
        }

        const serviceAny = serviceData as any
        const categoryName = Array.isArray(serviceAny.service_categories) 
            ? serviceAny.service_categories[0]?.name 
            : serviceAny.service_categories?.name
        
        console.log('[createAppointment] Category:', categoryName)
        
        // 3. Get customer & pet data
        const { data: petData, error: petError } = await supabase
            .from('pets')
            .select('id, name, customer_id, weight_kg, species, is_adapted')
            .eq('id', petId)
            .single()

        if (petError || !petData) {
            console.error('[createAppointment] Pet fetch error:', petError)
            return { message: 'Pet não encontrado.', success: false }
        }

        const isCreche = categoryName === 'Creche'
        const isHospedagem = categoryName === 'Hospedagem'

        // Validate Assessment for Creche/Hospedagem
        if (isCreche || isHospedagem) {
            // Se o pet já está marcado como adaptado na ficha, liberamos direto
            if (!petData.is_adapted) {
                const { data: assessment } = await supabase
                    .from('pet_assessments')
                    .select('status')
                    .eq('pet_id', petId)
                    .single()

                if (!assessment || assessment.status !== 'approved') {
                    return { message: `Este pet precisa de uma avaliação aprovada ou ser marcado como 'Adaptado' para ${categoryName}.`, success: false }
                }
            }
        }


        // Prepare Date Range
        let scheduledAt: string
        let checkIn: string | null = null
        let checkOut: string | null = null

        if (isHospedagem && checkInDate && checkOutDate) {
            checkIn = checkInDate
            checkOut = checkOutDate
            scheduledAt = new Date(`${checkInDate}T12:00:00-03:00`).toISOString()
        } else {
            try {
                scheduledAt = new Date(`${date}T${time}:00-03:00`).toISOString()
                const { data: blocks } = await supabase
                    .from('schedule_blocks')
                    .select('id, reason, allowed_species')
                    .eq('org_id', profile.org_id)
                    .lte('start_at', scheduledAt)
                    .gte('end_at', scheduledAt)

                const blockingBlocks = blocks?.filter(block => {
                    if (!block.allowed_species || block.allowed_species.length === 0) return true;
                    const species = (petData as any).species || 'dog'
                    return !block.allowed_species.includes(species)
                })

                if (blockingBlocks && blockingBlocks.length > 0 && !isCreche && !isHospedagem) {
                    if (isCustomer) return { message: `Horário bloqueado: ${blockingBlocks[0].reason}`, success: false }
                }
            } catch (dtErr) {
                console.error('[createAppointment] Date error:', dtErr)
                return { message: 'Data ou hora inválida.', success: false }
            }
        }

        // Pricing logic... (kept same)
        let calculatedPrice = (serviceData as any).base_price
        const weight = (petData as any).weight_kg ?? (petData as any).weight
        if (weight !== null && weight !== undefined) {
            const { data: rules } = await supabase
                .from('pricing_matrix')
                .select('fixed_price')
                .eq('service_id', serviceId)
                .eq('is_active', true)
                .lte('weight_min', weight)
                .gte('weight_max', weight)
            if (rules && rules.length > 0) {
                calculatedPrice = rules[0].fixed_price
            }
        }

        if (isHospedagem && checkIn && checkOut) {
            const start = new Date(checkIn); start.setHours(12,0,0,0)
            const end = new Date(checkOut); end.setHours(12,0,0,0)
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            calculatedPrice = calculatedPrice * (diffDays > 0 ? diffDays : 1)
        }

        // Create checklist
        const finalChecklist = (serviceAny.checklist_template || []).map((item: string) => ({
            text: item,
            completed: false,
            completed_at: null
        }))

        // 3. Create Appointment
        const { error: insertError } = await supabase
            .from('appointments')
            .insert({
                org_id: profile.org_id,
                pet_id: petId,
                service_id: serviceId,
                service_category_id: serviceAny.category_id,
                customer_id: petData.customer_id,
                staff_id: staffId || null,
                scheduled_at: scheduledAt,
                notes: notes || null,
                status: 'pending',
                checklist: finalChecklist,
                check_in_date: checkIn,
                check_out_date: checkOut,
                calculated_price: calculatedPrice,
                final_price: calculatedPrice,
                payment_status: 'pending'
            })

        if (insertError) {
            console.error('[createAppointment] Insert error:', insertError)
            return { message: `Erro ao agendar: ${insertError.message}`, success: false }
        }

        console.log('[createAppointment] Appointment created successfully')

        // WhatsApp notify
        try {
            const dateObj = (isHospedagem || isCreche)
                ? (checkInDate ? new Date(`${checkInDate}T12:00:00-03:00`) : new Date())
                : (date && time ? new Date(`${date}T${time}:00-03:00`) : new Date())
            let formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            let formattedTime = isHospedagem ? 'horário de entrada' : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

            if (isHospedagem && checkInDate && checkOutDate) {
                const start = new Date(`${checkInDate}T12:00:00-03:00`)
                const end = new Date(`${checkOutDate}T12:00:00-03:00`)
                const startFmt = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const endFmt = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                formattedDate = `${startFmt} a ${endFmt}`
                formattedTime = 'entrada e saída'
            }

            const serviceName = serviceAny.name || (isHospedagem ? 'Hospedagem' : isCreche ? 'Creche' : 'Atendimento')
            const msg = `Olá! Confirmamos o agendamento de *${petData.name}* para *${serviceName}* no dia *${formattedDate}* às *${formattedTime}*. Mal podemos esperar! 🐾`
            
            console.log('[createAppointment] Triggering WhatsApp...')
            await triggerNotification(profile.org_id, petData.customer_id, msg, 'pet-agendamento', {
                petName: petData.name,
                serviceName: serviceName,
                service_name: serviceName, // Fallback for snake_case
                formattedDate,
                formattedTime,
                date_start: checkInDate || formattedDate,
                date_end: checkOutDate || null,
                is_hospedagem: isHospedagem,
                is_creche: isCreche
            })
            console.log('[createAppointment] WhatsApp trigger call finished')
        } catch (waErr) {
            console.error('[createAppointment] WA notify catch:', waErr)
        }

        revalidatePath('/owner/agenda')
        return { message: 'Agendamento criado com sucesso!', success: true }
    } catch (globalErr: any) {
        console.error('[createAppointment] GLOBAL ERROR:', globalErr)
        return { message: `Erro fatal no servidor: ${globalErr.message}`, success: false }
    }
}

export async function updateAppointmentStatus(id: string, status: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    // WhatsApp status notification
    if (['confirmed', 'done', 'canceled'].includes(status)) {
        try {
            const { data: appt } = await supabase
                .from('appointments')
                .select('pet_id, customer_id, org_id, checklist, services(name)')
                .eq('id', id)
                .single()
            
            if (appt) {
                const { data: pet } = await supabase.from('pets').select('name').eq('id', appt.pet_id).single()
                const statusLabel = status === 'confirmed' ? 'Confirmado' : status === 'done' ? 'Finalizado' : 'Cancelado'
                
                let checklistSummary = ''
                if (status === 'done') {
                    const checklistItems = (appt as any).checklist || []
                    const completedItems = checklistItems.filter((i: any) => i.completed || i.checked || i.done)
                    if (completedItems.length > 0) {
                        checklistSummary = `\n\n*Resumo do atendimento:*\n${completedItems.map((i: any) => `✅ ${i.text || i.label || i.item}`).join('\n')}`
                    }
                }

                const msg = `Olá! O status do atendimento de *${pet?.name}* (${(appt.services as any)?.name}) foi atualizado para: *${statusLabel}*.${checklistSummary}`
                
                await triggerNotification(appt.org_id, appt.customer_id, msg, 'pet-status', {
                    petName: pet?.name,
                    serviceName: (appt.services as any)?.name,
                    statusLabel,
                    newStatus: status
                }).catch(e => console.error(e))
            }
        } catch (waErr) {
            console.error('[updateAppointmentStatus] WA notify error:', waErr)
        }
    }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/banho-tosa')
    revalidatePath('/owner/creche')
    revalidatePath('/owner/hospedagem')
    return { message: 'Status atualizado.', success: true }
}

export async function updateChecklist(id: string, checklist: { text?: string, label?: string, item?: string, completed?: boolean, checked?: boolean, done?: boolean, completed_at?: string | null }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    // Check if appointment is finished? Maybe
    // Just update JSONB
    const { error } = await supabase
        .from('appointments')
        .update({ checklist })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/banho-tosa')
    revalidatePath('/owner/creche')
    revalidatePath('/owner/hospedagem')
    return { message: 'Checklist salvo.', success: true }
}

export async function seedServices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro na organização.', success: false }

    const services = [
        { name: 'Banho', base_price: 45.00, category: 'banho', duration_minutes: 60 },
        { name: 'Tosa Higiênica', base_price: 30.00, category: 'tosa', duration_minutes: 30 },
        { name: 'Banho e Tosa', base_price: 80.00, category: 'banho_tosa', duration_minutes: 90 },
        { name: 'Hidratação', base_price: 25.00, category: 'outro', duration_minutes: 30 }
    ]

    for (const service of services) {
        const { count } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', profile.org_id)
            .eq('name', service.name)

        if (count === 0) {
            await supabase.from('services').insert({ ...service, org_id: profile.org_id })
        }
    }

    revalidatePath('/owner/agenda')
    return { message: 'Serviços cadastrados!', success: true }
}

export async function deleteAppointment(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    // **NOVO**: Buscar se o agendamento usou crédito de pacote
    const { data: appointment } = await supabase
        .from('appointments')
        .select('package_credit_id')
        .eq('id', id)
        .single()

    // Se usou crédito, devolver antes de deletar
    if (appointment?.package_credit_id) {
        await supabase.rpc('return_package_credit', {
            p_credit_id: appointment.package_credit_id
        })
    }

    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/pets')
    return { message: 'Agendamento excluído.', success: true }
}

export async function updateAppointment(prevState: CreateAppointmentState, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const id = formData.get('id') as string
    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const serviceId = formData.get('serviceId') as string
    const notes = formData.get('notes') as string
    const checkInDate = formData.get('checkInDate') as string
    const checkOutDate = formData.get('checkOutDate') as string

    if (!id || !serviceId) {
        return { message: 'ID e Serviço são obrigatórios.', success: false }
    }
    
    // Validate either date/time OR checkIn/checkOut
    if ((!date || !time) && (!checkInDate || !checkOutDate)) {
        return { message: 'Dados de data e hora incompletos.', success: false }
    }

    let scheduledAt = ''
    if (date && time) {
        try {
            scheduledAt = new Date(`${date}T${time}:00-03:00`).toISOString()
        } catch (_) {
            return { message: 'Data inválida.', success: false }
        }
    }

    const { error } = await supabase
        .from('appointments')
        .update({
            service_id: serviceId,
            scheduled_at: scheduledAt || null,
            notes: notes || null,
            check_in_date: checkInDate || null,
            check_out_date: checkOutDate || null
        })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    return { message: 'Agendamento atualizado!', success: true }
}

export async function updatePetPreferences(petId: string, prefs: { perfume_allowed?: boolean, accessories_allowed?: boolean }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('pets')
        .update(prefs)
        .eq('id', petId)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    return { message: 'Preferências atualizadas.', success: true }
}

export async function getPetAppointmentsByCategory(petId: string, category: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('appointments')
        .select(`
            id, scheduled_at, status, check_in_date, check_out_date,
            services!inner (
                name,
                service_categories!inner ( name )
            )
        `)
        .eq('pet_id', petId)
        .eq('org_id', profile.org_id)
        .eq('services.service_categories.name', category)
        .order('scheduled_at', { ascending: false })
        .limit(10)

    return data || []
}

export async function checkInAppointment(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const now = new Date().toISOString()
    const { error } = await supabase
        .from('appointments')
        .update({ actual_check_in: now, status: 'in_progress' })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    return { message: 'Check-in realizado!', success: true }
}

export async function checkOutAppointment(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const now = new Date().toISOString()
    const { error } = await supabase
        .from('appointments')
        .update({ actual_check_out: now, status: 'done' })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    return { message: 'Check-out realizado!', success: true }
}

export async function updatePaymentStatus(id: string, paymentStatus: string, paymentMethod?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const updateData: Record<string, unknown> = {
        payment_status: paymentStatus
    }

    if (paymentStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
        if (paymentMethod) {
            updateData.payment_method = paymentMethod
        }
    } else if (paymentStatus === 'pending') {
        updateData.paid_at = null
        updateData.payment_method = null
    }

    const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/banho-tosa')
    revalidatePath('/owner/creche')
    revalidatePath('/owner/hospedagem')
    revalidatePath('/owner')
    return { message: paymentStatus === 'paid' ? 'Pagamento registrado!' : 'Status de pagamento atualizado.', success: true }
}

export async function applyDiscount(id: string, discountVal: number, type: 'percent' | 'fixed' = 'percent', frontendBasePrice?: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    if (type === 'percent' && (discountVal < 0 || discountVal > 100)) {
        return { message: 'Desconto percentual deve ser entre 0% e 100%.', success: false }
    }
    if (type === 'fixed' && discountVal < 0) {
        return { message: 'Desconto deve ser um valor positivo.', success: false }
    }

    // Fetch current calculated_price
    const { data: appt, error: fetchErr } = await supabase
        .from('appointments')
        .select(`calculated_price, services(base_price)`)
        .eq('id', id)
        .single()

    if (fetchErr || !appt) return { message: 'Agendamento não encontrado.', success: false }

    const dbBasePrice = appt.calculated_price ?? (appt.services as any)?.base_price ?? 0
    const basePrice = frontendBasePrice ?? dbBasePrice
    
    let finalPrice = basePrice
    let discPercent = 0
    let discFixed = 0

    if (type === 'percent') {
        finalPrice = basePrice * (1 - discountVal / 100)
        discPercent = discountVal
        discFixed = basePrice - finalPrice
    } else {
        finalPrice = Math.max(0, basePrice - discountVal)
        discFixed = basePrice - finalPrice
        discPercent = basePrice > 0 ? (discFixed / basePrice) * 100 : 0
    }

    const { error } = await supabase
        .from('appointments')
        .update({
            discount_type: type,
            discount_percent: parseFloat(discPercent.toFixed(2)),
            discount: parseFloat(discFixed.toFixed(2)),
            final_price: parseFloat(finalPrice.toFixed(2))
        })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/banho-tosa')
    revalidatePath('/owner/creche')
    revalidatePath('/owner/hospedagem')
    revalidatePath('/owner')
    return { message: `Desconto aplicado! Valor final: R$ ${finalPrice.toFixed(2)}`, success: true }
}

/**
 * Helper to trigger WhatsApp notification via centralized router
 */
export async function triggerNotification(orgId: string, customerId: string, message: string, path: string = 'vet-alert', extraData: any = {}) {
    console.log(`[triggerNotification] Starting for org: ${orgId}, customer: ${customerId}, path: ${path}, extra:`, extraData)
    try {
        const supabase = await createClient()
        const { data: customer } = await supabase
            .from('customers')
            .select('phone_1')
            .eq('id', customerId)
            .single()

        console.log(`[triggerNotification] Customer phone: ${customer?.phone_1}`)

        if (customer?.phone_1) {
            const result = await sendWhatsAppMessage(orgId, customer.phone_1, message, path, extraData)
            console.log(`[triggerNotification] sendWhatsAppMessage result:`, result)
        } else {
            console.warn(`[triggerNotification] No phone found for customer ${customerId}`)
        }
    } catch (err) {
        console.error('[triggerNotification] Global error:', err)
    }
}
