'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { triggerNotification } from './appointment'

/**
 * Check-in an appointment (mark actual arrival time)
 */
export async function checkInAppointment(appointmentId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, message: 'Não autorizado.' }
        }

        const { error } = await supabase
            .from('appointments')
            .update({
                actual_check_in: new Date().toISOString(),
                status: 'in_progress'
            })
            .eq('id', appointmentId)

        if (error) {
            console.error('[Check-in] Error:', error)
            return { success: false, message: 'Erro ao fazer check-in' }
        }

        revalidatePath('/owner/banho-tosa')
        revalidatePath('/owner/agenda')

        // WhatsApp notification
        try {
            const { data: appt } = await supabase
                .from('appointments')
                .select('pet_id, customer_id, org_id, services(name)')
                .eq('id', appointmentId)
                .single()
            if (appt) {
                const { data: pet } = await supabase.from('pets').select('name').eq('id', appt.pet_id).single()
                const msg = `Olá! *${pet?.name}* acabou de fazer o *Check-in* para o serviço de *${(appt.services as any)?.name}*. Já estamos cuidando com muito carinho! ❤️`
                await triggerNotification(appt.org_id, appt.customer_id, msg, 'pet-agendamento').catch(e => console.error(e))
            }
        } catch (waErr) {
            console.error('[checkIn] WA notify error:', waErr)
        }

        return { success: true, message: 'Check-in realizado com sucesso!' }

    } catch (error) {
        console.error('[Check-in] Unexpected error:', error)
        return { success: false, message: 'Erro inesperado' }
    }
}

/**
 * Check-out an appointment (mark actual departure time)
 * Automatically marks the related package session as 'done' if applicable.
 */
export async function checkOutAppointment(appointmentId: string, checkoutType?: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, message: 'Não autorizado.' }
        }

        const updateData: any = {
            actual_check_out: new Date().toISOString(),
            status: 'done'
        }

        if (checkoutType) {
            updateData.checkout_type = checkoutType
        }

        const { error } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId)

        if (error) {
            console.error('[Check-out] Error:', error)
            return { success: false, message: 'Erro ao fazer check-out' }
        }

        // Marcar sessão de pacote como realizada automaticamente
        const { data: session } = await supabase
            .from('package_sessions')
            .select('id')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

        if (session?.id) {
            await supabase
                .from('package_sessions')
                .update({ status: 'done' })
                .eq('id', session.id)
        }

        revalidatePath('/owner/agenda')
        revalidatePath('/owner/pets')

        // WhatsApp notification
        try {
            const { data: appt } = await supabase
                .from('appointments')
                .select('pet_id, customer_id, org_id, services(name)')
                .eq('id', appointmentId)
                .single()
            if (appt) {
                const { data: pet } = await supabase.from('pets').select('name').eq('id', appt.pet_id).single()
                const msg = `Olá! *${pet?.name}* finalizou o serviço de *${(appt.services as any)?.name}* e está pronto para o *Check-out*. Até logo! 👋🐾`
                await triggerNotification(appt.org_id, appt.customer_id, msg, 'pet-agendamento').catch(e => console.error(e))
            }
        } catch (waErr) {
            console.error('[checkOut] WA notify error:', waErr)
        }

        return { success: true, message: 'Check-out realizado com sucesso!' }

    } catch (error) {
        console.error('[Check-out] Unexpected error:', error)
        return { success: false, message: 'Erro inesperado' }
    }
}
