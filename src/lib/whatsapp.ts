import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

// Circuit Breaker para evitar atrasos caso o N8N esteja offline
let n8nOfflineUntil = 0

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
      .select('wa_integration_type, wa_api_url, wa_api_token, wa_client_token, name')
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

    // Formata a mensagem final conforme o tipo de evento (idêntico aos templates dos workflows do N8N)
    let finalMessage = message
    if (webhookPath === 'pet-agendamento' && extraData.petName) {
        const pet = extraData.petName || 'seu pet'
        const service = extraData.serviceName || extraData.service_name || 'serviço'
        const date = extraData.formattedDate || ''
        const time = extraData.formattedTime || ''
        const orgName = extraData.orgName || org?.name || ''
        const orgSuffix = orgName ? ` na *${orgName}*` : ''
        finalMessage = `📅 *Agendamento Confirmado!*\n\n🐾 Pet: *${pet}*\n📋 Serviço: *${service}*\n📆 Data: *${date}* às *${time}*\n\nEstamos te esperando${orgSuffix}! Qualquer dúvida, é só chamar. 🐶`
    } else if (webhookPath === 'pet-reagendamento' && extraData.petName) {
        const pet = extraData.petName || 'seu pet'
        const service = extraData.serviceName || 'serviço'
        const date = extraData.formattedDate || ''
        const time = extraData.formattedTime || ''
        finalMessage = `🔄 *Horário Reagendado!*\n\nOlá! Passando para avisar que o horário do *${pet}* para *${service}* foi atualizado.\n\n📆 Nova Data: *${date}* às *${time}*\n\nQualquer dúvida, estamos à disposição! 🐶`
    }

    // Configuração do endpoint Z-API direto
    const rawZapiUrl = (integrationType === 'custom' && org?.wa_api_url) 
        ? org.wa_api_url 
        : (process.env.ZAPI_INSTANCE_ID ? `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}` : null)

    const zapiToken = (integrationType === 'custom' && org?.wa_api_token) 
        ? org.wa_api_token 
        : process.env.ZAPI_TOKEN

    const zapiClientToken = (integrationType === 'custom' && org?.wa_client_token) 
        ? org.wa_client_token 
        : (process.env.ZAPI_CLIENT_TOKEN || 'F9a70c76e1ddd4ec79ff35af7549a478fS')

    let zapiEndpoint: string | null = null
    if (rawZapiUrl) {
        const cleanUrl = rawZapiUrl.replace(/\/$/, '')
        if (cleanUrl.toLowerCase().includes('/token/')) {
            zapiEndpoint = `${cleanUrl}/send-text`
        } else if (zapiToken) {
            zapiEndpoint = `${cleanUrl}/token/${zapiToken}/send-text`
        }
    }

    // Função de fallback para envio direto via Z-API
    const sendDirectZapi = async () => {
        if (!zapiEndpoint) {
            console.error('[sendWhatsAppMessage] Fallback Z-API endpoint não configurado.')
            return { success: false, error: 'Endpoint Z-API não configurado.' }
        }

        console.log(`[sendWhatsAppMessage] Fallback ativo: Enviando direto via Z-API (${zapiEndpoint})...`)
        try {
            const zapiRes = await fetch(zapiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': zapiClientToken
                },
                body: JSON.stringify({
                    phone: normalizedPhone,
                    message: finalMessage
                }),
                signal: AbortSignal.timeout(8000)
            })

            if (!zapiRes.ok) {
                const errBody = await zapiRes.text()
                console.error('[sendWhatsAppMessage] Fallback Z-API erro:', zapiRes.status, errBody)
                return { success: false, error: `Erro Z-API: ${zapiRes.status} - ${errBody}` }
            }

            const zapiData = await zapiRes.json().catch(() => ({}))
            console.log('[sendWhatsAppMessage] Fallback Z-API enviado com sucesso!', zapiData)
            return { success: true }
        } catch (zapiErr: any) {
            console.error('[sendWhatsAppMessage] Fallback Z-API exception:', zapiErr)
            return { success: false, error: `Falha no envio direto Z-API: ${zapiErr.message}` }
        }
    }

    // Payload unificado que o N8N vai processar
    const payload = {
        ...extraData,
        phone: normalizedPhone,
        tutorPhone: normalizedPhone,
        normalizedPhone: normalizedPhone,
        message: finalMessage,
        customMessage: finalMessage,
        tenant_id: orgId,
        type: 'system_notification',
        wa_api_url: rawZapiUrl,
        wa_api_token: zapiToken,
        wa_client_token: zapiClientToken,
        wa_integration_type: integrationType
    }

    // 1. Tentar enviar via N8N se não estiver marcado como offline temporariamente
    const isN8nTemporarilyOffline = Date.now() < n8nOfflineUntil

    if (!isN8nTemporarilyOffline) {
        try {
            console.log(`[sendWhatsAppMessage] Tentando roteador N8N: ${fullUrl}`)
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(1200)
            })

            if (response.ok) {
                console.log('[sendWhatsAppMessage] N8N enviado com sucesso!')
                return { success: true }
            } else {
                const errText = await response.text().catch(() => '')
                console.warn(`[sendWhatsAppMessage] N8N retornou status ${response.status} (${errText}). Ativando fallback Z-API...`)
                n8nOfflineUntil = Date.now() + 5 * 60 * 1000 // 5 minutos
            }
        } catch (n8nErr: any) {
            console.warn(`[sendWhatsAppMessage] N8N indisponível (${n8nErr.name}: ${n8nErr.message}). Circuito aberto por 5 minutos, ativando fallback Z-API direto...`)
            n8nOfflineUntil = Date.now() + 5 * 60 * 1000 // 5 minutos
        }
    } else {
        console.log('[sendWhatsAppMessage] N8N em modo offline (circuit breaker ativo). Enviando direto via Z-API...')
    }

    // 2. Se o N8N falhou, está em modo offline ou inacessível, disparar direto no Z-API
    return await sendDirectZapi()

  } catch (error: any) {
    console.error('sendWhatsAppMessage Global Exception:', error)
    return { success: false, error: error.message }
  }
}
