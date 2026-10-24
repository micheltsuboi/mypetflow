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
        const timePart = time && time !== 'entrada' ? ` às *${time}*` : ''
        const orgName = extraData.orgName || org?.name || ''
        const orgSuffix = orgName ? ` na *${orgName}*` : ''
        finalMessage = `📅 *Agendamento Confirmado!*\n\n🐾 Pet: *${pet}*\n📋 Serviço: *${service}*\n📆 Data: *${date}*${timePart}\n\nEstamos te esperando${orgSuffix}! Qualquer dúvida, é só chamar. 🐶`
    } else if (webhookPath === 'pet-reagendamento' && extraData.petName) {
        const pet = extraData.petName || 'seu pet'
        const service = extraData.serviceName || 'serviço'
        const date = extraData.formattedDate || ''
        const time = extraData.formattedTime || ''
        const timePart = time && time !== 'entrada' ? ` às *${time}*` : ''
        finalMessage = `🔄 *Horário Reagendado!*\n\nOlá! Passando para avisar que o horário do *${pet}* para *${service}* foi atualizado.\n\n📆 Nova Data: *${date}*${timePart}\n\nQualquer dúvida, estamos à disposição! 🐶`
    } else if (webhookPath === 'pet-status' && extraData.petName && !message) {
        const pet = extraData.petName || 'seu pet'
        const statusLabel = extraData.statusLabel || 'Atualizado'
        finalMessage = `🐾 *Atualização do Atendimento*\n\nOlá! O status do atendimento do *${pet}* foi atualizado para: *${statusLabel}*.`
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

    // Função de envio direto via Z-API
    const sendDirectZapi = async () => {
        if (!zapiEndpoint) {
            console.error('[sendWhatsAppMessage] Endpoint Z-API não configurado.')
            return { success: false, error: 'Endpoint Z-API não configurado.' }
        }

        console.log(`[sendWhatsAppMessage] Enviando direto via Z-API (${zapiEndpoint})...`)
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
                const errBody = await zapiRes.text().catch(() => '')
                console.error('[sendWhatsAppMessage] Z-API erro:', zapiRes.status, errBody)
                return { success: false, error: `Erro Z-API: ${zapiRes.status} - ${errBody}` }
            }

            const zapiData = await zapiRes.json().catch(() => ({}))
            console.log('[sendWhatsAppMessage] Z-API enviado com sucesso!', zapiData)
            return { success: true }
        } catch (zapiErr: any) {
            console.error('[sendWhatsAppMessage] Z-API exception:', zapiErr)
            return { success: false, error: `Falha no envio direto Z-API: ${zapiErr.message}` }
        }
    }

    // 1. Envio Direto via Z-API (Método Primário e Independente do N8N)
    if (zapiEndpoint) {
        const zapiResult = await sendDirectZapi()
        if (zapiResult.success) {
            return { success: true }
        }
        console.warn('[sendWhatsAppMessage] Envio direto Z-API não concluiu. Tentando contingência N8N...', zapiResult.error)
    }

    // 2. Contingência Secundária via N8N (se disponível e não estiver em circuit breaker)
    const isN8nTemporarilyOffline = Date.now() < n8nOfflineUntil

    if (!isN8nTemporarilyOffline && process.env.N8N_BASE_URL) {
        // Payload unificado para o N8N
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

        try {
            console.log(`[sendWhatsAppMessage] Tentando contingência N8N: ${fullUrl}`)
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(1500)
            })

            if (response.ok) {
                console.log('[sendWhatsAppMessage] N8N enviado com sucesso!')
                return { success: true }
            } else {
                const errText = await response.text().catch(() => '')
                console.warn(`[sendWhatsAppMessage] N8N contingência retornou status ${response.status} (${errText}).`)
                n8nOfflineUntil = Date.now() + 5 * 60 * 1000 // 5 minutos
            }
        } catch (n8nErr: any) {
            console.warn(`[sendWhatsAppMessage] N8N contingência indisponível (${n8nErr.name}: ${n8nErr.message}).`)
            n8nOfflineUntil = Date.now() + 5 * 60 * 1000 // 5 minutos
        }
    }

    return { success: false, error: 'Não foi possível enviar a mensagem pelas integrações disponíveis.' }

  } catch (error: any) {
    console.error('sendWhatsAppMessage Global Exception:', error)
    return { success: false, error: error.message }
  }
}
