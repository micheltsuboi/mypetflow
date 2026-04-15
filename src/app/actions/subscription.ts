'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

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
    const subscription_time = formData.get('subscription_time') as string

    const rawDays = formData.getAll('default_days_of_week')
    const default_days = rawDays.map(d => parseInt(d as string)).filter(d => !isNaN(d))

    const { error } = await supabase
        .from('service_packages')
        .insert({
            org_id: profile.org_id,
            name,
            description,
            total_price,
            is_subscription: true,
            billing_day,
            subscription_time,
            subscription_days_of_week: default_days.length > 0 ? default_days : null,
            validity_type: 'monthly',
            validity_weeks: 4,
            auto_renew: true
        })

    if (error) return { message: error.message, success: false }

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
    const subscription_time = formData.get('subscription_time') as string

    const rawDays = formData.getAll('default_days_of_week')
    const default_days = rawDays.map(d => parseInt(d as string)).filter(d => !isNaN(d))

    const { error } = await supabase
        .from('service_packages')
        .update({
            name,
            description,
            total_price,
            billing_day,
            subscription_time,
            subscription_days_of_week: default_days.length > 0 ? default_days : null,
        })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

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

    const { data, error } = await supabase
        .from('service_packages')
        .select('*, package_items(id, service_id, quantity, services(id, name, category, base_price))')
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
            service_packages(id, name, total_price, billing_day, is_subscription)
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
            service_packages(id, name, total_price, billing_day, is_subscription),
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
    daysOfWeek: number[],
    time: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    // Fetch pet + customer + plan data
    const [petRes, planRes] = await Promise.all([
        supabase.from('pets').select('id, name, customer_id, customers(name, phone_1)').eq('id', petId).single(),
        supabase.from('service_packages').select('*, package_items(service_id, quantity)').eq('id', planId).single()
    ])

    if (petRes.error || !petRes.data) return { message: 'Pet não encontrado.', success: false }
    if (planRes.error || !planRes.data) return { message: 'Plano não encontrado.', success: false }

    const pet = petRes.data as any
    const plan = planRes.data as any

    // Calculate due_date (day 10 of next month)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10)
    const dueDate = nextMonth.toISOString().split('T')[0]
    const nextRenewal = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]

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
            payment_method: 'pending',
            payment_status: 'pending',
            notes: `Mensalidade: ${plan.name} — ${pet.name}`,
            is_subscription: true,
            preferred_days_of_week: daysOfWeek,
            preferred_day_of_week: daysOfWeek[0] ?? null,
            preferred_time: time,
            due_date: dueDate,
            next_renewal_date: nextRenewal,
            is_active: true
        })
        .select()
        .single()

    if (cpError || !cp) return { message: cpError?.message || 'Erro ao criar assinatura.', success: false }

    // Add package credits (one per service item)
    const credits = plan.package_items.map((item: any) => ({
        customer_package_id: cp.id,
        service_id: item.service_id,
        total_quantity: 100, // Subscription = unlimited montly credits
        used_quantity: 0,
        remaining_quantity: 100
    }))

    if (credits.length > 0) {
        await supabase.from('package_credits').insert(credits)
    }

    // Generate sessions for current month using the SQL function
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    await supabase.rpc('generate_subscription_sessions_for_month', {
        p_customer_package_id: cp.id,
        p_month_start: monthStart
    })

    // Create appointments in the agenda
    await supabase.rpc('create_appointments_from_subscription_sessions', {
        p_customer_package_id: cp.id,
        p_org_id: profile.org_id
    })

    // Fetch the generated sessions to build WhatsApp message
    const { data: sessions } = await supabase
        .from('package_sessions')
        .select('scheduled_at, session_number')
        .eq('customer_package_id', cp.id)
        .order('scheduled_at', { ascending: true })

    // Send WhatsApp confirmation with all session dates
    const customerPhone = (pet.customers as any)?.phone_1
    if (customerPhone && sessions && sessions.length > 0) {
        const dayNames = daysOfWeek.map(d => DAYS_OF_WEEK_PT[d]).join(' e ')
        const sessionList = sessions.map((s: any) => {
            const d = new Date(s.scheduled_at)
            const dayName = DAYS_OF_WEEK_PT[d.getDay()]
            const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return `• ${dayName}, ${dateStr} às ${timeStr}`
        }).join('\n')

        const monthName = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString('pt-BR', { month: 'long' })

        const message =
            `🐾 *${pet.name}* está inscrito(a) em *${plan.name}*!\n\n` +
            `📅 Sessões de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}:\n` +
            `${sessionList}\n\n` +
            `💳 Valor mensal: R$ ${plan.total_price.toFixed(2).replace('.', ',')} (vence dia 10)\n\n` +
            `Qualquer dúvida, fale conosco! 🐶`

        await sendWhatsAppMessage(
            profile.org_id,
            customerPhone,
            message,
            'appointment-reminder',
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
    const supabase = await createClient()

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
            await supabase.rpc('generate_subscription_sessions_for_month', {
                p_customer_package_id: sub.id,
                p_month_start: monthStart
            })
            await supabase.rpc('create_appointments_from_subscription_sessions', {
                p_customer_package_id: sub.id,
                p_org_id: orgId
            })
            renewed++
        }
    }

    return { message: `${renewed} mensalidades renovadas para o mês.`, success: true, count: renewed }
}

// =====================================================
// DUE DATE REMINDER (called by N8N on day 8 of each month)
// =====================================================

export async function sendSubscriptionDueDateReminders(orgId?: string) {
    const supabase = await createClient()

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
        const message =
            `⏰ Olá, *${customer?.name}*!\n\n` +
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
