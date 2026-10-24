'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export interface SendManualWhatsAppParams {
    phone: string
    message: string
    petName?: string
    serviceName?: string
    tutorName?: string
    appointmentId?: string
    customerId?: string
}

export async function sendManualWhatsApp(params: SendManualWhatsAppParams) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const adminSupabase = await createAdminClient()
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('org_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id && profile?.role !== 'superadmin') {
            return { success: false, message: 'Organização não identificada para este usuário.' }
        }

        let orgId = profile?.org_id

        // Se for superadmin e tiver appointmentId ou customerId, identifica a organização vinculada
        if (!orgId && params.appointmentId) {
            const { data: appt } = await adminSupabase
                .from('appointments')
                .select('org_id')
                .eq('id', params.appointmentId)
                .single()
            if (appt) orgId = appt.org_id
        }

        if (!orgId && params.customerId) {
            const { data: cust } = await adminSupabase
                .from('customers')
                .select('org_id')
                .eq('id', params.customerId)
                .single()
            if (cust) orgId = cust.org_id
        }

        if (!orgId) {
            return { success: false, message: 'Não foi possível identificar a organização para o envio.' }
        }

        const rawPhone = (params.phone || '').trim()
        if (!rawPhone) {
            return { success: false, message: 'O número de telefone é obrigatório.' }
        }

        const rawMessage = (params.message || '').trim()
        if (!rawMessage) {
            return { success: false, message: 'A mensagem não pode ser vazia.' }
        }

        const res = await sendWhatsAppMessage(
            orgId,
            rawPhone,
            rawMessage,
            'manual',
            {
                petName: params.petName,
                serviceName: params.serviceName,
                tutorName: params.tutorName,
                appointmentId: params.appointmentId,
                customerId: params.customerId
            }
        )

        if (!res.success) {
            return { success: false, message: res.error || 'Falha ao enviar mensagem de WhatsApp.' }
        }

        return { success: true, message: 'Mensagem de WhatsApp enviada com sucesso ao tutor!' }
    } catch (err: any) {
        console.error('[sendManualWhatsApp] Erro:', err)
        return { success: false, message: err.message || 'Erro inesperado ao disparar mensagem.' }
    }
}
