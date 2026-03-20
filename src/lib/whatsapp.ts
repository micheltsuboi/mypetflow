import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

export async function sendWhatsAppMessage(
  orgId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    // 1. Identify organization integration type and API credentials using the admin client
    // We use the admin client so we can safely read the `wa_api_token` if needed, although RLS might block normal users.
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('wa_integration_type, wa_api_url, wa_api_token')
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

    if (integrationType === 'custom') {
      const url = org.wa_api_url
      const token = org.wa_api_token

      if (!url || !token) {
         console.warn(`sendWhatsAppMessage: Org ${orgId} has 'custom' integration but missing url or token.`)
         return { success: false, error: 'Configuração de WhatsApp customizada incompleta.' }
      }

      // 2. Dispatch custom integration
      // Expected payload based on common API providers like Z-API / Evolution:
      // Typically: { phone: string, message: string }
      // This might need adjustments based on the exact customer's API payload format.
      // We will assume Z-API standard format for custom APIs as well: { phone, message }
      
      const endpoint = `${url.replace(/\/$/, '')}/send-text`
      console.log(`sendWhatsAppMessage [CUSTOM]: Sending to ${endpoint} with phone ${normalizedPhone}`)
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            message: message
          })
        })

        if (!response.ok) {
           const errText = await response.text()
           console.error('sendWhatsAppMessage [CUSTOM] error response:', response.status, errText)
           return { success: false, error: `Erro na API customizada: ${response.status} - ${errText}` }
        }

        return { success: true }
      } catch (fetchErr: any) {
        console.error('sendWhatsAppMessage [CUSTOM] fetch error:', fetchErr)
        return { success: false, error: `Falha ao tentar conectar na API customizada: ${fetchErr.message}` }
      }

    } else {
      // 3. Dispatch system integration
      // Currently, the system uses Z-API directly or via N8N for notifications.
      // We'll map it to the global environment variables or existing N8N logic.
      const n8nBaseUrl = process.env.N8N_BASE_URL
      console.log(`sendWhatsAppMessage [SYSTEM]: Using N8N base URL ${n8nBaseUrl} for phone ${normalizedPhone}`)

      if (n8nBaseUrl) {
         const fullUrl = `${n8nBaseUrl.replace(/\/$/, '')}/webhook/vet-alert-final-v5`
         
         const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tutorPhone: normalizedPhone,
                message: message,
                tenant_id: orgId,
                type: 'system_notification'
            })
         })

         if (!response.ok) {
            console.error('sendWhatsAppMessage [SYSTEM] error response:', response.statusText)
            return { success: false, error: 'Erro ao disparar notificação pelo sistema.' }
         }

         return { success: true }
      } else {
         console.warn('sendWhatsAppMessage [SYSTEM]: N8N_BASE_URL undefined')
         return { success: false, error: 'Serviço global de mensagens não configurado.' }
      }
    }

  } catch (error: any) {
    console.error('sendWhatsAppMessage Exception:', error)
    return { success: false, error: error.message }
  }
}
