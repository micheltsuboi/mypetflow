'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getFirstName } from '@/utils/formatters'

const DAYS_OF_WEEK_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// =====================================================
// SUBSCRIPTION PLANS (Templates)
// =====================================================

export async function createSubscriptionPlan(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const total_price = parseFloat(formData.get('total_price') as string)
    const billing_day = parseInt(formData.get('billing_day') as string) || 10

    const servicesJson = formData.get('services_json') as string
    let itemsToInsert: { service_id: string; quantity: number }[] = []

    if (servicesJson) {
        try {
            const parsed = JSON.parse(servicesJson) as { service_id: string; quantity: number; recurrence_type?: string }[]
            itemsToInsert = parsed.map(item => ({
                service_id: item.service_id,
                quantity: item.quantity || 1,
                recurrence_type: item.recurrence_type || 'fixed'
            }))
        } catch (e) {
            console.error('Erro ao fazer parse de services_json:', e)
        }
    } else {
        const rawServices = formData.getAll('service_ids')
        const service_ids = rawServices.map(s => s as string).filter(Boolean)
        itemsToInsert = service_ids.map(sid => ({
            service_id: sid,
            quantity: 1,
            recurrence_type: 'fixed'
        }))
    }

    const { data: package_data, error } = await supabase
        .from('service_packages')
        .insert({
            org_id: profile.org_id,
            name,
            description,
            total_price,
            is_subscription: true,
            billing_day,
            validity_type: 'weekly',
            validity_weeks: 4,
            validity_days: 28,
            auto_renew: true
        })
        .select()
        .single()

    if (error || !package_data) return { message: error?.message || 'Erro ao criar plano.', success: false }

    if (itemsToInsert.length > 0) {
        const items = itemsToInsert.map(item => ({
            package_id: package_data.id,
            service_id: item.service_id,
            quantity: item.quantity,
            recurrence_type: item.recurrence_type
        }))
        const { error: itemsError } = await supabase.from('package_items').insert(items)
        if (itemsError) return { message: itemsError.message, success: false }
    }

    revalidatePath('/owner/mensalidades')
    return { message: 'Plano de mensalidade criado!', success: true }
}

export async function updateSubscriptionPlan(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const total_price = parseFloat(formData.get('total_price') as string)
    const billing_day = parseInt(formData.get('billing_day') as string) || 10

    const servicesJson = formData.get('services_json') as string
    let itemsToInsert: { service_id: string; quantity: number }[] = []

    if (servicesJson) {
        try {
            const parsed = JSON.parse(servicesJson) as { service_id: string; quantity: number; recurrence_type?: string }[]
            itemsToInsert = parsed.map(item => ({
                service_id: item.service_id,
                quantity: item.quantity || 1,
                recurrence_type: item.recurrence_type || 'fixed'
            }))
        } catch (e) {
            console.error('Erro ao fazer parse de services_json:', e)
        }
    } else {
        const rawServices = formData.getAll('service_ids')
        const service_ids = rawServices.map(s => s as string).filter(Boolean)
        itemsToInsert = service_ids.map(sid => ({
            service_id: sid,
            quantity: 1,
            recurrence_type: 'fixed'
        }))
    }

    const { error } = await supabase
        .from('service_packages')
        .update({
            name,
            description,
            total_price,
            billing_day,
            validity_type: 'weekly',
            validity_weeks: 4,
            validity_days: 28
        })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    // Atualiza links de serviços
    await supabase.from('package_items').delete().eq('package_id', id)
    
    if (itemsToInsert.length > 0) {
        const items = itemsToInsert.map(item => ({
            package_id: id,
            service_id: item.service_id,
            quantity: item.quantity,
            recurrence_type: item.recurrence_type
        }))
        const { error: itemsError } = await supabase.from('package_items').insert(items)
        if (itemsError) return { message: itemsError.message, success: false }
    }

    revalidatePath('/owner/mensalidades')
    return { message: 'Plano atualizado!', success: true }
}

export async function deleteSubscriptionPlan(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', id)
        .eq('is_subscription', true)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/mensalidades')
    return { message: 'Plano excluído.', success: true }
}

export async function toggleSubscriptionPlanStatus(id: string, isActive: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('service_packages')
        .update({ is_active: isActive })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/mensalidades')
    return { message: isActive ? 'Plano ativado!' : 'Plano desativado!', success: true }
}

export async function getSubscriptionPlans() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    // AUTO-FIX: Corrige planos antigos que possam ter 'monthly' (que viola a restrição atual do banco)
    await supabase
        .from('service_packages')
        .update({ validity_type: 'weekly', validity_weeks: 4, validity_days: 28 })
        .eq('org_id', profile.org_id)
        .eq('is_subscription', true)
        .eq('validity_type', 'monthly')

    const { data, error } = await supabase
        .from('service_packages')
        .select('*, package_items(id, service_id, quantity, recurrence_type, services(id, name, category, base_price))')
        .eq('org_id', profile.org_id)
        .eq('is_subscription', true)
        .order('name')

    if (error) { console.error(error); return [] }
    return data || []
}

// =====================================================
// ACTIVE SUBSCRIPTIONS (Contratos)
// =====================================================

export async function getActiveSubscriptions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data, error } = await supabase
        .from('customer_packages')
        .select(`
            *,
            customers(id, name, phone_1),
            pets(id, name, species),
            service_packages(
                id, name, total_price, billing_day, is_subscription,
                package_items(id, service_id, quantity, recurrence_type, services(id, name, category, base_price))
            )
        `)
        .eq('org_id', profile.org_id)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .order('purchased_at', { ascending: false })

    if (error) { console.error(error); return [] }
    return data || []
}

export async function getPetSubscriptions(petId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('customer_packages')
        .select(`
            *,
            service_packages(
                id, name, total_price, billing_day, is_subscription,
                package_items(id, service_id, quantity, recurrence_type, services(id, name, category, base_price))
            ),
            package_sessions(id, scheduled_at, status, session_number, appointment_id)
        `)
        .eq('pet_id', petId)
        .eq('is_subscription', true)
        .order('purchased_at', { ascending: false })

    if (error) { console.error(error); return [] }
    return data || []
}

// =====================================================
// SUBSCRIBE PET TO A PLAN
// =====================================================

export async function subscribePetToMensalidade(
    petId: string,
    planId: string,
    daysOfWeek: number[] | null,
    time: string | null,
    creditSchedules?: { service_id: string, preferred_days_of_week?: number[] | null, preferred_time?: string | null }[] | null
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    // Fetch pet + customer + plan data
    const [petRes, planRes] = await Promise.all([
        supabase.from('pets').select('id, name, customer_id, customers(name, phone_1)').eq('id', petId).single(),
        supabase.from('service_packages').select('*, package_items(service_id, quantity, recurrence_type)').eq('id', planId).single()
    ])

    if (petRes.error || !petRes.data) return { message: 'Pet não encontrado.', success: false }
    if (planRes.error || !planRes.data) return { message: 'Plano não encontrado.', success: false }

    const pet = petRes.data as any
    const plan = planRes.data as any

    // Calculate due_date based on plan's billing day
    const billingDay = plan.billing_day || 10
    const now = new Date()
    
    // As per user request: if hired today (16/04), next payment is 10/05
    // Logic: First payment always on the next occurrence of billing_day in the NEXT month
    let dueMonth = now.getMonth() + 1
    let dueYear = now.getFullYear()
    if (dueMonth > 11) {
        dueMonth = 0
        dueYear++
    }
    
    const dueDateObj = new Date(dueYear, dueMonth, billingDay)
    const dueDate = dueDateObj.toISOString().split('T')[0]
    
    // next_renewal_date is usually the 1st of the next month for session generation
    const nextRenewal = new Date(dueYear, dueMonth, 1).toISOString().split('T')[0]

    // Create customer_package record
    const { data: cp, error: cpError } = await supabase
        .from('customer_packages')
        .insert({
            org_id: profile.org_id,
            customer_id: pet.customer_id,
            pet_id: petId,
            package_id: planId,
            total_price: plan.total_price,
            total_paid: 0,
            payment_method: null,
            payment_status: 'pending',
            notes: `Mensalidade: ${plan.name} — ${pet.name}`,
            is_subscription: true,
            preferred_days_of_week: daysOfWeek,
            preferred_day_of_week: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek[0] : null,
            preferred_time: time,
            due_date: dueDate,
            next_renewal_date: nextRenewal,
            is_active: true
        })
        .select()
        .single()

    if (cpError || !cp) return { message: cpError?.message || 'Erro ao criar assinatura.', success: false }

    // Cria os registros em package_credits para cada serviço da mensalidade
    const credits = plan.package_items.map((item: any) => {
        const schedule = creditSchedules?.find(s => s.service_id === item.service_id)
        return {
            customer_package_id: cp.id,
            service_id: item.service_id,
            total_quantity: item.quantity,
            used_quantity: 0,
            remaining_quantity: item.quantity,
            preferred_days_of_week: schedule?.preferred_days_of_week ?? daysOfWeek ?? null,
            preferred_time: schedule?.preferred_time ?? time ?? null,
            recurrence_type: item.recurrence_type || 'fixed'
        }
    })

    const { error: creditsError } = await supabase.from('package_credits').insert(credits)
    if (creditsError) {
        await supabase.from('customer_packages').delete().eq('id', cp.id)
        return { message: creditsError.message, success: false }
    }

    // Generate sessions for current month using the SQL function
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const { data: genData, error: genError } = await supabase.rpc('generate_subscription_sessions_for_month', {
        p_customer_package_id: cp.id,
        p_month_start: monthStart
    })

    if (genError) {
        console.error('Error generating sessions:', genError)
        return { message: 'Plano ativado, mas erro ao gerar sessões: ' + genError.message, success: true }
    }

    // Create appointments in the agenda
    const { data: apptData, error: apptError } = await supabase.rpc('create_appointments_from_subscription_sessions', {
        p_customer_package_id: cp.id,
        p_org_id: profile.org_id
    })

    if (apptError) {
        console.error('Error creating appointments:', apptError)
    }

    // Fetch the generated sessions to build WhatsApp message
    const { data: sessions } = await supabase
        .from('package_sessions')
        .select('scheduled_at, session_number, services(name)')
        .eq('customer_package_id', cp.id)
        .order('scheduled_at', { ascending: true })

    // Send WhatsApp confirmation with all session dates
    const customerPhone = (pet.customers as any)?.phone_1
    if (customerPhone && sessions && sessions.length > 0) {
        const dayNames = daysOfWeek ? daysOfWeek.map(d => DAYS_OF_WEEK_PT[d]).join(' e ') : ''
        const sessionList = sessions
            .filter((s: any) => s.scheduled_at !== null)
            .map((s: any) => {
                const d = new Date(s.scheduled_at)
                const dayNameRaw = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
                const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1)
                const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
                const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                const serviceSuffix = s.services?.name ? ` (${s.services.name})` : ''
                return `• ${dayName}, ${dateStr} às ${timeStr}${serviceSuffix}`
            }).join('\n')

        const monthName = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString('pt-BR', { month: 'long' })

        const message =
            `🐾 *${pet.name}* está inscrito(a) em *${plan.name}*!\n\n` +
            `📅 *Cronograma de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}*:\n` +
            `${sessionList}\n\n` +
            `💳 Valor mensal: R$ ${plan.total_price.toFixed(2).replace('.', ',')} (Vencimento dia ${billingDay})\n\n` +
            `Qualquer dúvida, fale conosco! 🐶`

        await sendWhatsAppMessage(
            profile.org_id,
            customerPhone,
            message,
            'package-confirmation',
            { type: 'subscription_confirmation', petName: pet.name, planName: plan.name }
        )
    }

    revalidatePath('/owner/mensalidades')
    revalidatePath('/owner/pets')
    revalidatePath('/owner/agenda')

    return {
        message: `✅ Mensalidade "${plan.name}" ativada para ${pet.name}! ${sessions?.length || 0} sessões agendadas.`,
        success: true,
        sessionCount: sessions?.length || 0
    }
}

// =====================================================
// CANCEL SUBSCRIPTION
// =====================================================

export async function cancelSubscription(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    // Deactivate subscription
    await supabase
        .from('customer_packages')
        .update({ is_active: false, paused: false })
        .eq('id', id)

    // Cancel future pending sessions
    const { data: sessions } = await supabase
        .from('package_sessions')
        .select('appointment_id')
        .eq('customer_package_id', id)
        .in('status', ['scheduled', 'pending'])
        .not('appointment_id', 'is', null)

    if (sessions && sessions.length > 0) {
        const appointmentIds = sessions.map(s => s.appointment_id).filter(Boolean)
        if (appointmentIds.length > 0) {
            await supabase
                .from('appointments')
                .update({ status: 'cancelled', notes: '🚫 Mensalidade cancelada' })
                .in('id', appointmentIds)
                .in('status', ['pending', 'confirmed'])
        }
        await supabase
            .from('package_sessions')
            .update({ status: 'cancelled' })
            .eq('customer_package_id', id)
            .in('status', ['scheduled', 'pending'])
    }

    revalidatePath('/owner/mensalidades')
    revalidatePath('/owner/pets')
    revalidatePath('/owner/agenda')
    return { message: 'Mensalidade cancelada e agendamentos removidos.', success: true }
}

export async function pauseSubscription(id: string, paused: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('customer_packages')
        .update({ paused })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/mensalidades')
    return { message: paused ? 'Mensalidade pausada.' : 'Mensalidade reativada!', success: true }
}

// =====================================================
// MONTHLY RENEWAL (called by API route triggered by N8N)
// =====================================================

export async function renewAllSubscriptionsForMonth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Sem org.', success: false }

    return await renewSubscriptionsForOrg(profile.org_id)
}

export async function renewSubscriptionsForOrg(orgId: string) {
    const supabase = createAdminClient()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // Fetch all active, non-paused subscriptions for this org
    const { data: subscriptions } = await supabase
        .from('customer_packages')
        .select('id, pet_id, preferred_days_of_week, preferred_time, service_packages(name, total_price)')
        .eq('org_id', orgId)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .eq('paused', false)

    if (!subscriptions || subscriptions.length === 0) {
        return { message: 'Nenhuma mensalidade ativa.', success: true, count: 0 }
    }

    let renewed = 0
    for (const sub of subscriptions) {
        // Check sessions for current month don't exist yet
        const { count } = await supabase
            .from('package_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('customer_package_id', sub.id)
            .gte('period_start', monthStart)

        if ((count ?? 0) === 0) {
            // 1. Gera as sessões e compromissos via RPC
            await supabase.rpc('generate_subscription_sessions_for_month', {
                p_customer_package_id: sub.id,
                p_month_start: monthStart
            })
            await supabase.rpc('create_appointments_from_subscription_sessions', {
                p_customer_package_id: sub.id,
                p_org_id: orgId
            })

            // 2. Sobrescreve o due_date com a data de vencimento calculada corretamente baseada no billing_day do plano
            try {
                const { data: spData } = await supabase
                    .from('customer_packages')
                    .select('package_id, service_packages(billing_day)')
                    .eq('id', sub.id)
                    .single()

                const billingDay = (spData?.service_packages as any)?.billing_day || 10
                const [year, month] = monthStart.split('-').map(Number)
                const correctDueDateObj = new Date(year, month - 1, billingDay)
                const correctDueDateStr = correctDueDateObj.toISOString().split('T')[0]

                await supabase
                    .from('customer_packages')
                    .update({ due_date: correctDueDateStr })
                    .eq('id', sub.id)
            } catch (err) {
                console.error(`[renewSubscriptionsForOrg] Erro ao corrigir due_date para sub ${sub.id}:`, err)
            }

            renewed++
        }
    }

    return { message: `${renewed} mensalidades renovadas para o mês.`, success: true, count: renewed }
}

// =====================================================
// DUE DATE REMINDER (called by N8N on day 8 of each month)
// =====================================================

export async function sendSubscriptionDueDateReminders(orgId?: string) {
    const supabase = createAdminClient()

    // 1. Auto-renovação de assinaturas com next_renewal_date atrasado
    try {
        const todayStr = new Date().toISOString().split('T')[0]
        let queryRenew = supabase
            .from('customer_packages')
            .select('org_id')
            .eq('is_subscription', true)
            .eq('is_active', true)
            .eq('paused', false)
            .lte('next_renewal_date', todayStr)

        if (orgId) queryRenew = queryRenew.eq('org_id', orgId)

        const { data: expiredSubs } = await queryRenew

        if (expiredSubs && expiredSubs.length > 0) {
            const uniqueOrgs = [...new Set(expiredSubs.map(s => s.org_id))]
            console.log(`[sendSubscriptionDueDateReminders] Renovando ${expiredSubs.length} mensalidades atrasadas para ${uniqueOrgs.length} organizações.`)
            for (const id of uniqueOrgs) {
                await renewSubscriptionsForOrg(id)
            }
        }
    } catch (renewErr) {
        console.error('[sendSubscriptionDueDateReminders] Erro na auto-renovação de mensalidades:', renewErr)
    }

    // 2. Busca de lembretes normais
    let query = supabase
        .from('customer_packages')
        .select(`
            id, total_price,
            customers(name, phone_1),
            pets(name),
            service_packages(name, billing_day),
            org_id
        `)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .eq('paused', false)

    if (orgId) query = query.eq('org_id', orgId)

    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) return { success: true, count: 0 }

    let sent = 0
    for (const sub of subscriptions) {
        const customer = (sub.customers as any)
        const pet = (sub.pets as any)
        const plan = (sub.service_packages as any)
        const phone = customer?.phone_1

        if (!phone) continue

        const billingDay = plan?.billing_day || 10
        const price = sub.total_price || plan?.total_price || 0
        const tutorFirstName = getFirstName(customer?.name)
        const message =
            `⏰ Olá, *${tutorFirstName}*!\n\n` +
            `A mensalidade de *${pet?.name}* (*${plan?.name}*) vence no dia *${billingDay}*.\n\n` +
            `💳 Valor: *R$ ${Number(price).toFixed(2).replace('.', ',')}*\n\n` +
            `Entre em contato para realizar o pagamento e manter os agendamentos do próximo mês! 🐾`

        await sendWhatsAppMessage(
            sub.org_id,
            phone,
            message,
            'appointment-reminder',
            { type: 'subscription_due_date', petName: pet?.name }
        )
        sent++
    }

    return { success: true, count: sent, message: `${sent} lembretes enviados.` }
}

export async function updateSubscriptionContract(
    id: string,
    daysOfWeek: number[] | null,
    time: string | null,
    creditSchedules?: { service_id: string, preferred_days_of_week?: number[] | null, preferred_time?: string | null }[] | null,
    totalPrice?: number | null,
    updateFutureSessions: boolean = true
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    // 1. Extrair dias e horários consolidados a partir de creditSchedules se daysOfWeek/time não foram passados
    let effectiveDays = daysOfWeek
    let effectiveTime = time
    if ((!effectiveDays || effectiveDays.length === 0) && creditSchedules && creditSchedules.length > 0) {
        effectiveDays = Array.from(new Set(creditSchedules.flatMap(s => s.preferred_days_of_week || []))).sort((a, b) => a - b)
        effectiveTime = creditSchedules.find(s => s.preferred_time)?.preferred_time || time
    }

    // 2. Atualiza customer_packages
    const updatePayload: any = {
        preferred_days_of_week: effectiveDays && effectiveDays.length > 0 ? effectiveDays : null,
        preferred_day_of_week: effectiveDays && effectiveDays.length > 0 ? effectiveDays[0] : null,
        preferred_time: effectiveTime || null
    }
    if (totalPrice !== undefined && totalPrice !== null) {
        updatePayload.total_price = totalPrice
    }

    const { error: updateError } = await supabase
        .from('customer_packages')
        .update(updatePayload)
        .eq('id', id)

    if (updateError) return { message: updateError.message, success: false }

    // 3. Atualiza package_credits
    if (creditSchedules && creditSchedules.length > 0) {
        for (const sched of creditSchedules) {
            await supabase
                .from('package_credits')
                .update({
                    preferred_days_of_week: sched.preferred_days_of_week && sched.preferred_days_of_week.length > 0 ? sched.preferred_days_of_week : null,
                    preferred_time: sched.preferred_time || null
                })
                .eq('customer_package_id', id)
                .eq('service_id', sched.service_id)
        }
    } else {
        await supabase
            .from('package_credits')
            .update({
                preferred_days_of_week: effectiveDays && effectiveDays.length > 0 ? effectiveDays : null,
                preferred_time: effectiveTime || null
            })
            .eq('customer_package_id', id)
    }

    // 4. Se solicitado, atualiza os agendamentos/sessões pendentes futuras deste mês para o novo dia e horário
    let rescheduledCount = 0
    if (updateFutureSessions && creditSchedules && creditSchedules.length > 0) {
        const now = new Date()
        const { data: pendingSessions } = await supabase
            .from('package_sessions')
            .select('id, scheduled_at, appointment_id, service_id')
            .eq('customer_package_id', id)
            .in('status', ['scheduled', 'rescheduled'])
            .gte('scheduled_at', now.toISOString())
            .order('scheduled_at', { ascending: true })

        if (pendingSessions && pendingSessions.length > 0) {
            for (const sess of pendingSessions) {
                const sched = creditSchedules.find(s => s.service_id === sess.service_id)
                const targetDays = sched?.preferred_days_of_week || effectiveDays
                if (targetDays && targetDays.length > 0 && sess.scheduled_at) {
                    const targetDay = targetDays[0] // 0 = Dom, 1 = Seg, 2 = Ter...
                    const oldDate = new Date(sess.scheduled_at)
                    
                    // Ajusta para o dia desejado na mesma semana (Segunda a Domingo)
                    const currentDow = oldDate.getDay()
                    const diffDays = targetDay - currentDow
                    const newDate = new Date(oldDate)
                    newDate.setDate(oldDate.getDate() + diffDays)
                    
                    const timeStr = sched?.preferred_time || effectiveTime || '09:00'
                    const [h, m] = timeStr.split(':')
                    newDate.setHours(parseInt(h || '9', 10), parseInt(m || '0', 10), 0, 0)
                    const newIso = newDate.toISOString()

                    await supabase
                        .from('package_sessions')
                        .update({ scheduled_at: newIso, status: 'rescheduled' })
                        .eq('id', sess.id)

                    if (sess.appointment_id) {
                        await supabase
                            .from('appointments')
                            .update({ scheduled_at: newIso })
                            .eq('id', sess.appointment_id)
                    }
                    rescheduledCount++
                }
            }
        }
    }

    revalidatePath('/owner/mensalidades')
    revalidatePath('/owner/pets')
    revalidatePath('/owner/agenda')

    const successMsg = rescheduledCount > 0 
        ? `Mensalidade atualizada e ${rescheduledCount} agendamento(s) futuro(s) movidos para o novo dia!`
        : 'Ajustes da mensalidade salvos com sucesso!'

    return { message: successMsg, success: true }
}

