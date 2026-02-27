'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const N8N_BASE_URL = process.env.N8N_BASE_URL!

/**
 * Dispara o webhook N8N com os dados enriquecidos do agendamento para envio de WhatsApp
 */
async function triggerStatusWebhook(
    appointmentId: string,
    newStatus: 'in_progress' | 'done'
) {
    try {
        // Usa o cliente admin para garantir acesso aos dados sem RLS
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: appointment } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                status,
                pets ( name ),
                services ( name ),
                customers ( name, phone_1, phone_2 )
            `)
            .eq('id', appointmentId)
            .single()

        if (!appointment) {
            console.warn('[N8N Webhook] Agendamento não encontrado:', appointmentId)
            return
        }

        const petName = (appointment.pets as any)?.name ?? 'seu pet'
        const serviceName = (appointment.services as any)?.name ?? 'serviço'
        const customer = appointment.customers as any
        const tutorPhone = customer?.phone_1 || customer?.phone_2 || null

        if (!tutorPhone) {
            console.warn('[N8N Webhook] Sem telefone para o tutor, pulando disparo.')
            return
        }

        const scheduledAt = appointment.scheduled_at
        const formattedDate = scheduledAt
            ? new Date(scheduledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : ''
        const formattedTime = scheduledAt
            ? new Date(scheduledAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            })
            : ''

        const payload = {
            appointmentId,
            newStatus,
            oldStatus: newStatus === 'in_progress' ? 'confirmed' : 'in_progress',
            petName,
            serviceName,
            tutorPhone,
            formattedDate,
            formattedTime,
        }

        const webhookUrl = `${N8N_BASE_URL}/webhook/pet-status`

        const n8nUrlObj = new URL(webhookUrl)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }

        // Suporte a credenciais básicas no URL (se configuradas)
        if (n8nUrlObj.username && n8nUrlObj.password) {
            const encodedAuth = Buffer.from(`${n8nUrlObj.username}:${n8nUrlObj.password}`).toString('base64')
            headers['Authorization'] = `Basic ${encodedAuth}`
            n8nUrlObj.username = ''
            n8nUrlObj.password = ''
        }

        console.log(`[N8N Webhook] Disparando check-in/out: ${newStatus} para pet "${petName}"`)

        const response = await fetch(n8nUrlObj.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
        })

        const responseText = await response.text()
        console.log(`[N8N Webhook] Resposta: ${response.status} - ${responseText}`)

    } catch (err: any) {
        // Falha não bloqueia o fluxo principal
        console.warn('[N8N Webhook] Erro ao disparar (não crítico):', err?.message)
    }
}

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

        // Dispara webhook N8N para envio de WhatsApp (não bloqueia em caso de falha)
        await triggerStatusWebhook(appointmentId, 'in_progress')

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
 */
export async function checkOutAppointment(appointmentId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, message: 'Não autorizado.' }
        }

        const { error } = await supabase
            .from('appointments')
            .update({
                actual_check_out: new Date().toISOString(),
                status: 'done' // Auto-complete on checkout
            })
            .eq('id', appointmentId)

        if (error) {
            console.error('[Check-out] Error:', error)
            return { success: false, message: 'Erro ao fazer check-out' }
        }

        // Dispara webhook N8N para envio de WhatsApp (não bloqueia em caso de falha)
        await triggerStatusWebhook(appointmentId, 'done')

        revalidatePath('/owner/creche')
        revalidatePath('/owner/banho-tosa')
        revalidatePath('/owner/agenda')
        return { success: true, message: 'Check-out realizado com sucesso!' }

    } catch (error) {
        console.error('[Check-out] Unexpected error:', error)
        return { success: false, message: 'Erro inesperado' }
    }
}
