import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export async function sendWhatsAppMessage(
  orgId: string,
  phone: string,
  message: string,
  webhookPath: string = 'vet-alert',
  extraData: any = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSupabase = await createAdminClient()

    console.log(`[sendWhatsAppMessage] Fetching org configuration for orgId: ${orgId}`)
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('wa_integration_type, wa_api_url, wa_api_token, wa_client_token')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('[sendWhatsAppMessage] Org fetch error:', orgError)
      return { success: false, error: 'Configuração da organização não encontrada no banco.' }
    }
    console.log('[sendWhatsAppMessage] Org config found:', org ? 'YES' : 'NO')

    const integrationType = org?.wa_integration_type || 'system'
    
    // Normalize phone number (must be just numbers, removing +, -, spaces, etc.)
    let normalizedPhone = phone.replace(/\D/g, '')
    if (normalizedPhone.length >= 10 && !normalizedPhone.startsWith('55')) {
       normalizedPhone = '55' + normalizedPhone
    }

    const n8nBaseUrl = process.env.N8N_BASE_URL || 'http://72.62.107.69:5678'
    const baseUrlFormatted = n8nBaseUrl?.replace(/\/$/, '')
    const fullUrl = `${baseUrlFormatted}/webhook/${webhookPath}`
    
    console.log(`[sendWhatsAppMessage] n8nBaseUrl: ${process.env.N8N_BASE_URL ? 'from env' : 'FALLBACK USED'} (${n8nBaseUrl})`)
    console.log(`[sendWhatsAppMessage] Full URL: ${fullUrl}`)

    if (!baseUrlFormatted) {
       console.warn('sendWhatsAppMessage: N8N_BASE_URL undefined and fallback failed')
       return { success: false, error: 'Serviço global de mensagens não configurado.' }
    }

    if (!org) {
        console.error(`[sendWhatsAppMessage] Organization ${orgId} not found in DB`)
        return { success: false, error: 'Organização não encontrada.' }
    }

    // Payload unificado que o N8N vai processar
    const payload = {
        ...extraData,
        phone: normalizedPhone,
        tutorPhone: normalizedPhone,
        normalizedPhone: normalizedPhone,
        message: message,
        tenant_id: orgId,
        type: 'system_notification',
        wa_api_url: org.wa_api_url,
        wa_api_token: org.wa_api_token,
        wa_client_token: org.wa_client_token || org.wa_api_token,
        wa_integration_type: integrationType
    }

    console.log(`[sendWhatsAppMessage] Payload ready for phone: ${normalizedPhone}`)

    try {
        console.log(`[sendWhatsAppMessage] Fetching ${fullUrl}...`)
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        console.log(`[sendWhatsAppMessage] Response status: ${response.status}`)

        if (!response.ok) {
            const errText = await response.text()
            console.error('sendWhatsAppMessage [N8N] error response:', response.status, errText)
            return { success: false, error: `Erro no Roteador N8N: ${response.status}` }
        }

        console.log(`[sendWhatsAppMessage] Success!`)
        return { success: true }
    } catch (fetchErr: any) {
        console.error('sendWhatsAppMessage [N8N] fetch exception:', fetchErr)
        return { success: false, error: `Falha na conexão com o Roteador N8N: ${fetchErr.message}` }
    }

  } catch (error: any) {
    console.error('sendWhatsAppMessage Global Exception:', error)
    return { success: false, error: error.message }
  }
}
