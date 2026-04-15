'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ActionState {
    message: string
    success: boolean
    data?: unknown
}

// =====================================================
// SERVICE PACKAGES (Templates)
// =====================================================

export async function createServicePackage(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const total_price = parseFloat(formData.get('total_price') as string)
    const validity_type = (formData.get('validity_type') as string) || 'unlimited'
    const validity_weeks = parseInt(formData.get('validity_weeks') as string) || 1
    const auto_renew = validity_type !== 'unlimited'
    
    // Compatibilidade com validity_days (usado para expiração legada)
    const validity_days = validity_type === 'weekly' ? (validity_weeks * 7) : null

    const { data: package_data, error: packageError } = await supabase
        .from('service_packages')
        .insert({
            org_id: profile.org_id,
            name,
            description,
            total_price,
            validity_days,
            validity_type,
            validity_weeks: validity_type === 'weekly' ? validity_weeks : 1,
            auto_renew
        })
        .select()
        .single()

    if (packageError) return { message: packageError.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Pacote criado!', success: true, data: package_data }
}

export async function updateServicePackage(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const total_price = parseFloat(formData.get('total_price') as string)
    const validity_type = (formData.get('validity_type') as string) || 'unlimited'
    const validity_weeks = parseInt(formData.get('validity_weeks') as string) || 1
    const auto_renew = validity_type !== 'unlimited'
    const validity_days = validity_type === 'weekly' ? (validity_weeks * 7) : null

    const { error } = await supabase
        .from('service_packages')
        .update({ 
            name, 
            description, 
            total_price, 
            validity_days, 
            validity_type, 
            validity_weeks: validity_type === 'weekly' ? validity_weeks : 1, 
            auto_renew 
        })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Pacote atualizado!', success: true }
}

export async function deleteServicePackage(id: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase.from('service_packages').delete().eq('id', id)
    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Pacote excluído.', success: true }
}

export async function togglePackageStatus(id: string, isActive: boolean): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('service_packages')
        .update({ is_active: isActive })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: isActive ? 'Pacote ativado!' : 'Pacote desativado!', success: true }
}

// =====================================================
// PACKAGE ITEMS (Composição)
// =====================================================

export async function addPackageItem(packageId: string, serviceId: string, quantity: number): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('package_items')
        .insert({ package_id: packageId, service_id: serviceId, quantity })

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Serviço adicionado ao pacote!', success: true }
}

export async function updatePackageItem(id: string, quantity: number): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('package_items')
        .update({ quantity })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Quantidade atualizada!', success: true }
}

export async function deletePackageItem(id: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase.from('package_items').delete().eq('id', id)
    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: 'Serviço removido do pacote.', success: true }
}

// =====================================================
// CUSTOMER PACKAGES (Vendas) - Com suporte a dia/hora
// =====================================================

export async function sellPackageToCustomer(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    const customer_id = formData.get('customer_id') as string
    const package_id = formData.get('package_id') as string
    const pet_id = formData.get('pet_id') as string || null
    const total_paid = parseFloat(formData.get('total_paid') as string)
    const payment_method = formData.get('payment_method') as string
    const notes = formData.get('notes') as string || null
    // Suporte a múltiplos dias da semana
    // O formulário pode enviar dias como vários campos 'preferred_days_of_week[]' ou um único 'preferred_day_of_week'
    const rawDays = formData.getAll('preferred_days_of_week')
    const preferred_days_of_week: number[] = rawDays.length > 0
        ? rawDays.map(d => parseInt(d as string)).filter(d => !isNaN(d))
        : []
    // Fallback para campo singular (legado)
    const preferred_day_of_week_legacy = formData.get('preferred_day_of_week')
        ? parseInt(formData.get('preferred_day_of_week') as string)
        : null
    const effective_days = preferred_days_of_week.length > 0
        ? preferred_days_of_week
        : (preferred_day_of_week_legacy !== null ? [preferred_day_of_week_legacy] : [])

    const preferred_time = formData.get('preferred_time') as string || null

    const { data: packageData, error: packageError } = await supabase
        .from('service_packages')
        .select('*, package_items(service_id, quantity)')
        .eq('id', package_id)
        .single()

    if (packageError || !packageData) {
        return { message: 'Pacote não encontrado.', success: false }
    }

    const sp = packageData as any
    const validity_weeks = sp.validity_weeks || 1
    const validity_days = sp.validity_days || (validity_weeks * 7)

    const { data: customerPackage, error: cpError } = await supabase
        .from('customer_packages')
        .insert({
            customer_id,
            pet_id,
            package_id,
            org_id: profile.org_id,
            total_paid: total_paid,
            total_price: total_paid, // Assuming at this endpoint it's the contract price
            payment_method: payment_method,
            notes: notes,
            expires_at: validity_days ? new Date(Date.now() + validity_days * 86400000).toISOString() : null,
            preferred_day_of_week: effective_days.length === 1 ? effective_days[0] : (effective_days[0] ?? null),
            preferred_days_of_week: effective_days.length > 0 ? effective_days : null,
            preferred_time: preferred_time
        })
        .select()
        .single()

    if (cpError || !customerPackage) {
        return { message: cpError?.message || 'Erro ao criar pacote.', success: false }
    }

    const credits = packageData.package_items.map((item: { service_id: string; quantity: number }) => ({
        customer_package_id: customerPackage.id,
        service_id: item.service_id,
        total_quantity: item.quantity,
        used_quantity: 0,
        remaining_quantity: item.quantity
    }))

    const { error: creditsError } = await supabase.from('package_credits').insert(credits)

    if (creditsError) {
        await supabase.from('customer_packages').delete().eq('id', customerPackage.id)
        return { message: creditsError.message, success: false }
    }

    // Gerar sessões do período atual (a migration já tem trigger para criar appointments)
    await supabase.rpc('generate_package_sessions', { p_customer_package_id: customerPackage.id })

    // Se tem dias/hora definidos, garantir que os appointments foram criados
    if (effective_days.length > 0 && preferred_time && pet_id) {
        await createScheduledAppointmentsForPackage(supabase, customerPackage.id, profile.org_id)
    }

    // Criar transação financeira se houver pagamento inicial
    if (total_paid > 0) {
        await supabase.from('financial_transactions').insert({
            org_id: profile.org_id,
            type: 'income',
            category: 'Venda de Pacote',
            amount: total_paid,
            description: `Pacote: ${packageData.name} - Cliente: ${customer_id}`,
            payment_method: payment_method,
            created_by: user.id,
            date: new Date().toISOString(),
            reference_id: customerPackage.id,
            reference_type: 'package'
        })
    }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/financeiro')
    return { message: 'Pacote vendido com sucesso!', success: true }
}

// Helper: criar agendamentos automáticos para sessões com horário definido
// O trigger da migration 090 tenta fazer isso automaticamente,
// mas esta função garante que sessões sem appointment sejam vinculadas
async function createScheduledAppointmentsForPackage(supabase: any, customerPackageId: string, orgId: string) {
    const { data: sessions } = await supabase
        .from('package_sessions')
        .select('id, scheduled_at, service_id, session_number, appointment_id, customer_packages(pet_id, customer_id, package_id)')
        .eq('customer_package_id', customerPackageId)
        .eq('status', 'scheduled')
        .is('appointment_id', null)

    if (!sessions || sessions.length === 0) return

    // Buscar o total de sessões deste pacote para compor a nota
    const { data: allSessions } = await supabase
        .from('package_sessions')
        .select('id')
        .eq('customer_package_id', customerPackageId)
    const totalSessions = allSessions?.length ?? sessions.length

    // Buscar nome do pacote
    const cp = sessions[0]?.customer_packages
    let packageName = 'Pacote'
    if (cp?.package_id) {
        const { data: sp } = await supabase
            .from('service_packages')
            .select('name')
            .eq('id', cp.package_id)
            .single()
        if (sp) packageName = sp.name
    }

    for (const session of sessions) {
        if (!session.scheduled_at) continue

        const petId = cp?.pet_id
        const customerId = cp?.customer_id
        if (!petId) continue

        // Buscar o credit correspondente a este serviço
        const { data: credit } = await supabase
            .from('package_credits')
            .select('id')
            .eq('customer_package_id', customerPackageId)
            .eq('service_id', session.service_id)
            .single()

        const sessionLabel = session.session_number
            ? `Sessão ${session.session_number} de ${totalSessions}`
            : 'Sessão de pacote'

        const { data: appt, error } = await supabase
            .from('appointments')
            .insert({
                org_id: orgId,
                pet_id: petId,
                service_id: session.service_id,
                customer_id: customerId,
                scheduled_at: session.scheduled_at,
                status: 'pending',
                package_credit_id: credit?.id ?? null,
                notes: `📦 ${packageName} — ${sessionLabel}`,
                calculated_price: 0,
                final_price: 0,
                payment_status: 'pending',
                discount_percent: 0,
                is_package: true
            })
            .select('id')
            .single()

        if (!error && appt) {
            await supabase
                .from('package_sessions')
                .update({ appointment_id: appt.id })
                .eq('id', session.id)
        }
    }
}

export async function sellPackageToPet(
    petId: string,
    packageId: string,
    totalPaid: number,
    paymentMethod: string,
    preferredDaysOfWeek?: number[] | null,
    preferredTime?: string | null
): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('customer_id, name')
        .eq('id', petId)
        .single()

    if (petError || !petData) return { message: 'Pet não encontrado.', success: false }

    const { data: packageData, error: packageError } = await supabase
        .from('service_packages')
        .select('*, package_items(service_id, quantity)')
        .eq('id', packageId)
        .single()

    if (packageError || !packageData) return { message: 'Pacote não encontrado.', success: false }

    const sp = packageData as any
    const validity_weeks = sp.validity_weeks || 1
    const validity_days = sp.validity_days || (validity_weeks * 7)

    const effectiveDays = preferredDaysOfWeek && preferredDaysOfWeek.length > 0 ? preferredDaysOfWeek : null

    const { data: customerPackage, error: cpError } = await supabase
        .from('customer_packages')
        .insert({
            customer_id: petData.customer_id,
            pet_id: petId,
            package_id: packageId,
            org_id: profile.org_id,
            total_paid: 0, // When activating from Pet Ficha, it starts as pending/0 paid
            total_price: totalPaid, // totalPaid was used to pass the price from UI
            payment_method: paymentMethod,
            notes: `Pacote para ${petData.name}`,
            expires_at: validity_days ? new Date(Date.now() + validity_days * 86400000).toISOString() : null,
            preferred_day_of_week: effectiveDays ? effectiveDays[0] : null,
            preferred_days_of_week: effectiveDays,
            preferred_time: preferredTime ?? null
        })
        .select()
        .single()

    if (cpError || !customerPackage) {
        return { message: cpError?.message || 'Erro ao criar pacote.', success: false }
    }

    const credits = packageData.package_items.map((item: { service_id: string; quantity: number }) => ({
        customer_package_id: customerPackage.id,
        service_id: item.service_id,
        total_quantity: item.quantity,
        used_quantity: 0,
        remaining_quantity: item.quantity
    }))

    const { error: creditsError } = await supabase.from('package_credits').insert(credits)

    if (creditsError) {
        await supabase.from('customer_packages').delete().eq('id', customerPackage.id)
        return { message: creditsError.message, success: false }
    }

    // Gerar sessões do período atual
    await supabase.rpc('generate_package_sessions', { p_customer_package_id: customerPackage.id })

    // Criar agendamentos automáticos se tiver dias/hora
    if (effectiveDays && effectiveDays.length > 0 && preferredTime) {
        await createScheduledAppointmentsForPackage(supabase, customerPackage.id, profile.org_id)
    }

    // Se totalPaid > 0 (passado via UI), registrar transação
    // Nota: sellPackageToPet normalmente é usado para pacotes que começam pendentes,
    // mas se a UI passar um valor, registramos.
    if (totalPaid > 0) {
        await supabase.from('financial_transactions').insert({
            org_id: profile.org_id,
            type: 'income',
            category: 'Venda de Pacote',
            amount: totalPaid,
            description: `Pacote: ${packageData.name} - Pet: ${petData.name}`,
            payment_method: paymentMethod,
            created_by: user.id,
            date: new Date().toISOString(),
            reference_id: customerPackage.id,
            reference_type: 'package'
        })
    }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/financeiro')
    return { message: `Pacote "${packageData.name}" ativado para ${petData.name}!`, success: true }
}

export async function renewCustomerPackage(customerPackageId: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { message: 'Erro de organização.', success: false }

    const { data: currentPackage } = await supabase
        .from('customer_packages')
        .select('*, service_packages(validity_days, validity_type, auto_renew, package_items(service_id, quantity))')
        .eq('id', customerPackageId)
        .single()

    if (!currentPackage) return { message: 'Pacote não encontrado.', success: false }

    const sp = currentPackage.service_packages as any
    const validity_weeks = sp.validity_weeks || (sp.validity_type === 'monthly' ? 4 : 1)
    const validity_days = sp.validity_days || (validity_weeks * 7)

    const newPackage = await supabase
        .from('customer_packages')
        .insert({
            customer_id: currentPackage.customer_id,
            pet_id: currentPackage.pet_id,
            package_id: currentPackage.package_id,
            org_id: currentPackage.org_id,
            total_paid: 0,
            payment_method: 'other',
            notes: 'Renovação automática',
            expires_at: validity_days ? new Date(Date.now() + validity_days * 86400000).toISOString() : null,
            preferred_day_of_week: currentPackage.preferred_day_of_week,
            preferred_time: currentPackage.preferred_time,
            renewal_count: (currentPackage.renewal_count || 0) + 1,
            parent_package_id: customerPackageId
        })
        .select()
        .single()

    if (newPackage.error || !newPackage.data) return { message: 'Erro ao renovar pacote.', success: false }

    // Créditos: quantidade original (sem carry-over para renovação automática)
    const newCredits = sp.package_items.map((item: any) => ({
        customer_package_id: newPackage.data.id,
        service_id: item.service_id,
        total_quantity: item.quantity,
        used_quantity: 0,
        remaining_quantity: item.quantity
    }))

    await supabase.from('package_credits').insert(newCredits)

    // Desativar pacote antigo
    await supabase.from('customer_packages').update({ is_active: false }).eq('id', customerPackageId)

    // Gerar sessões do novo período
    await supabase.rpc('generate_package_sessions', { p_customer_package_id: newPackage.data.id })

    // Criar agendamentos automáticos
    if (currentPackage.preferred_day_of_week !== null && currentPackage.preferred_time) {
        await createScheduledAppointmentsForPackage(supabase, newPackage.data.id, profile.org_id)
    }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/agenda')
    revalidatePath('/staff')
    return { message: 'Pacote renovado com sucesso!', success: true }
}

export async function cancelCustomerPackage(id: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    // 1. Desativar o pacote
    const { error: updateError } = await supabase
        .from('customer_packages')
        .update({ is_active: false })
        .eq('id', id)

    if (updateError) return { message: updateError.message, success: false }

    // 2. Buscar agendamentos pendentes vinculados ao pacote (através das sessões)
    const { data: sessions } = await supabase
        .from('package_sessions')
        .select('appointment_id')
        .eq('customer_package_id', id)
        .is('status', 'scheduled')
        .not('appointment_id', 'is', null)

    if (sessions && sessions.length > 0) {
        const appointmentIds = sessions.map(s => s.appointment_id)

        // Cancelar os agendamentos no calendário que ainda não foram realizados
        await supabase
            .from('appointments')
            .update({ status: 'cancelled', notes: '🚫 Cancelado por cancelamento do pacote' })
            .in('id', appointmentIds)
            .in('status', ['pending', 'confirmed'])
        
        // Limpar os IDs nas sessões
        await supabase
            .from('package_sessions')
            .update({ status: 'cancelled' })
            .eq('customer_package_id', id)
            .is('status', 'scheduled')
    }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/pets')
    revalidatePath('/owner/agenda')
    revalidatePath('/staff')
    return { message: 'Pacote cancelado e agendamentos pendentes removidos.', success: true }
}

export async function pauseCustomerPackage(id: string, paused: boolean): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('customer_packages')
        .update({ paused })
        .eq('id', id)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    return { message: paused ? 'Pacote pausado.' : 'Pacote reativado!', success: true }
}

// =====================================================
// PACKAGE SESSIONS
// =====================================================

export async function getPackageSessions(customerPackageId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('package_sessions')
        .select(`
            *,
            services(id, name),
            appointments(id, scheduled_at, status)
        `)
        .eq('customer_package_id', customerPackageId)
        .order('period_start', { ascending: false })
        .order('scheduled_at', { ascending: true })

    if (error) return []
    return data || []
}

export async function reschedulePackageSession(
    sessionId: string,
    newScheduledAt: string,
    createNewAppointment: boolean,
    petId?: string,
    orgId?: string,
    serviceId?: string
): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const updateData: any = {
        scheduled_at: newScheduledAt,
        status: 'rescheduled'
    }

    if (createNewAppointment && petId && orgId && serviceId) {
        const { data: appt } = await supabase
            .from('appointments')
            .insert({
                org_id: orgId,
                pet_id: petId,
                service_id: serviceId,
                scheduled_at: newScheduledAt,
                status: 'pending',
                notes: '📦 Reagendamento de pacote',
                calculated_price: 0,
                final_price: 0,
                payment_status: 'pending',
                discount_percent: 0,
                is_package: true
            })
            .select('id')
            .single()

        if (appt) updateData.appointment_id = appt.id
    }

    const { error } = await supabase
        .from('package_sessions')
        .update(updateData)
        .eq('id', sessionId)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/agenda')
    revalidatePath('/owner/pets')
    return { message: 'Sessão reagendada!', success: true }
}

export async function markSessionDone(sessionId: string, done: boolean): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('package_sessions')
        .update({ status: done ? 'done' : 'pending' })
        .eq('id', sessionId)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/pets')
    return { message: done ? 'Sessão marcada como realizada!' : 'Sessão revertida para pendente.', success: true }
}

export async function updatePackagePaymentStatus(customerPackageId: string, status: string): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { error } = await supabase
        .from('customer_packages')
        .update({ payment_status: status })
        .eq('id', customerPackageId)

    if (error) return { message: error.message, success: false }

    revalidatePath('/owner/packages')
    revalidatePath('/owner/pets')
    revalidatePath('/owner/agenda')
    return { message: 'Pagamento do pacote atualizado!', success: true }
}

// =====================================================
// EXISTING FUNCTIONS (mantidas)
// =====================================================

export async function getPetPackagesWithUsage(petId: string) {
    const supabase = await createClient()

    const { data: summary, error } = await supabase.rpc('get_pet_package_summary', {
        p_pet_id: petId
    })

    if (error) {
        console.error('Erro ao buscar resumo de pacotes:', error)
        return []
    }

    if (!summary || summary.length === 0) return []

    const packagesWithUsage = await Promise.all(summary.map(async (item: any) => {
        const { data: credit } = await supabase
            .from('package_credits')
            .select('id')
            .eq('customer_package_id', item.customer_package_id)
            .eq('service_id', item.service_id)
            .single()

        let appointments: any[] = []
        if (credit) {
            const { data: apps } = await supabase
                .from('appointments')
                .select('id, scheduled_at, status')
                .eq('package_credit_id', credit.id)
                .order('scheduled_at', { ascending: false })

            if (apps) appointments = apps
        }

        const { data: cp } = await supabase
            .from('customer_packages')
            .select('payment_status, total_paid, total_price, org_id')
            .eq('id', item.customer_package_id)
            .single()

        // Buscar sessões do período atual
        let sessions: any[] = []
        const { data: sessionData } = await supabase
            .from('package_sessions')
            .select('*, services(name), appointments(id, scheduled_at, status)')
            .eq('customer_package_id', item.customer_package_id)
            .order('period_start', { ascending: false })
            .order('scheduled_at', { ascending: true })
            .limit(20)

        if (sessionData) sessions = sessionData

        return {
            ...item,
            credit_id: credit?.id,
            payment_status: cp?.payment_status,
            total_paid: cp?.total_paid,
            total_price: cp?.total_price,
            org_id: cp?.org_id,
            appointments,
            sessions
        }
    }))

    return packagesWithUsage
}
