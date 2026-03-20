'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getWhatsAppConfig() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Usuário não autenticado.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return { success: false, error: 'Organização não encontrada.' }
    }

    if (!['admin', 'superadmin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado.' }
    }

    const adminSupabase = await createAdminClient()
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('wa_integration_type, wa_api_url, wa_api_token, wa_client_token, logo_url, notify_appointment_confirmed, notify_service_status, notify_reminder_24h, notify_vet_alerts')
      .eq('id', profile.org_id)
      .single()

    if (orgError) {
      return { success: false, error: 'Erro ao buscar organização.' }
    }

    // Return the settings. Mask the token if it exists.
    return {
      success: true,
      data: {
        integrationType: org.wa_integration_type || 'system',
        apiUrl: org.wa_api_url || '',
        hasToken: !!org.wa_api_token,
        hasClientToken: !!org.wa_client_token,
        logoUrl: org.logo_url || null,
        notifications: {
          appointmentConfirmed: org.notify_appointment_confirmed ?? true,
          serviceStatus: org.notify_service_status ?? true,
          reminder24h: org.notify_reminder_24h ?? true,
          vetAlerts: org.notify_vet_alerts ?? true
        }
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveWhatsAppConfig(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Usuário não autenticado.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return { success: false, error: 'Organização não encontrada.' }
    }

    if (!['admin', 'superadmin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado. Requer permissão de administrador.' }
    }

    const integrationType = formData.get('integration_type') as string
    const apiUrl = formData.get('api_url') as string
    const apiToken = formData.get('api_token') as string
    const clientToken = formData.get('client_token') as string
    const logoUrl = formData.get('logo_url') as string
    
    // Notifications mapping
    const notify_appointment_confirmed = formData.get('notify_appointment_confirmed') === 'true'
    const notify_service_status = formData.get('notify_service_status') === 'true'
    const notify_reminder_24h = formData.get('notify_reminder_24h') === 'true'
    const notify_vet_alerts = formData.get('notify_vet_alerts') === 'true'

    // Validate
    if (integrationType === 'custom') {
      if (!apiUrl) {
         return { success: false, error: 'A URL do webhook/API é obrigatória para o modo customizado.' }
      }
      // Se não mudar o token (veio vazio ou não preencheu), usamos apenas o URL para atualizar ou precisamos checar se já tinha token.
      // the front-end vai enviar token em branco se o cara não digitou (para não sobrescrever um existente)
    }

    const payload: any = {
      wa_integration_type: integrationType,
      logo_url: logoUrl || null,
      notify_appointment_confirmed,
      notify_service_status,
      notify_reminder_24h,
      notify_vet_alerts
    }

    if (integrationType === 'custom') {
      payload.wa_api_url = apiUrl
      if (apiToken && apiToken.trim() !== '') {
         payload.wa_api_token = apiToken
      }
      if (clientToken && clientToken.trim() !== '') {
         payload.wa_client_token = clientToken
      }
    } else {
      // Optando pelo sistema, limpamos as credenciais locais
      payload.wa_api_url = null
      payload.wa_api_token = null
      payload.wa_client_token = null
    }

    const adminSupabase = await createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('organizations')
      .update(payload)
      .eq('id', profile.org_id)

    if (updateError) {
      console.error('saveWhatsAppConfig: Supabase Update Detailed Error', updateError)
      return { success: false, error: `Erro ao salvar no banco: ${updateError.message || updateError.code}` }
    }

    revalidatePath('/owner/integracoes')
    return { success: true, message: 'Configurações atualizadas com sucesso.' }
  } catch (error: any) {
    console.error('saveWhatsAppConfig Error:', error)
    return { success: false, error: error.message }
  }
}
