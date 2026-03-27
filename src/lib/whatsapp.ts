import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export async function sendWhatsAppMessage(
  orgId: string,
  phone: string,
  message: string,
  webhookPath: string = 'vet-alert'
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSupabase = await createAdminClient()

    // 1. Identify organization integration type and API credentials using the admin client
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('wa_integration_type, wa_api_url, wa_api_token, wa_client_token')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('sendWhatsAppMessage: Error fetching org configuration:', orgError)
      return { success: false, error: 'Configuração da organização não encontrada.' }
    }

    const integrationType = org.wa_integration_type || 'system'
    
    // Normalize phone number (must be just numbers, removing +, -, spaces, etc.)
    let normalizedPhone = phone.replace(/\D/g, '')
    if (normalizedPhone.length >= 10 && !normalizedPhone.startsWith('55')) {
       normalizedPhone = '55' + normalizedPhone
    }

    // DISPATCHER MASTER: Usamos o N8N como roteador universal para todos os envios.
    // Isso permite centralizar logs, tratar erros e usar instâncias dinâmicas.
    const n8nBaseUrl = process.env.N8N_BASE_URL
    console.log(`sendWhatsAppMessage: Routing via N8N Master Router (${integrationType}) for phone ${normalizedPhone}`)

    if (!n8nBaseUrl) {
       console.warn('sendWhatsAppMessage: N8N_BASE_URL undefined')
       return { success: false, error: 'Serviço global de mensagens não configurado.' }
    }

    // O path padrão é 'vet-alert', mas permitimos outros como 'pet-agendamento'
    const fullUrl = `${n8nBaseUrl.replace(/\/$/, '')}/webhook/${webhookPath}`
    
    // Payload unificado que o N8N vai processar
    const payload = {
        phone: normalizedPhone,
        tutorPhone: normalizedPhone,
        normalizedPhone: normalizedPhone,
        message: message,
        tenant_id: orgId,
        type: 'system_notification',
        // Repassamos as credenciais (que podem ser NULL se for o sistema padrão)
        // O N8N decide qual usar (a sua própria ou a enviada)
        wa_api_url: org.wa_api_url,
        wa_api_token: org.wa_api_token,
        wa_client_token: org.wa_client_token || org.wa_api_token,
        wa_integration_type: integrationType
    }

    try {
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('sendWhatsAppMessage [N8N] error response:', response.status, errText)
            return { success: false, error: `Erro no Roteador N8N: ${response.status}` }
        }

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
