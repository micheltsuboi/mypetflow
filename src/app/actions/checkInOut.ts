'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

        revalidatePath('/owner/creche')
        revalidatePath('/owner/banho-tosa')
        revalidatePath('/owner/agenda')
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

        revalidatePath('/owner/creche')
        revalidatePath('/owner/banho-tosa')
        revalidatePath('/owner/agenda')
        revalidatePath('/owner/pets')
        return { success: true, message: 'Check-out realizado com sucesso!' }

    } catch (error) {
        console.error('[Check-out] Unexpected error:', error)
        return { success: false, message: 'Erro inesperado' }
    }
}
