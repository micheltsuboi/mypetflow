'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface DisparoResponse {
  success: boolean
  message: string
  error?: string
}

export async function getDisparoConfig() {
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

    // Apenas donos, administradores e superadmins podem gerenciar disparos
    if (!['admin', 'superadmin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Acesso negado. Apenas administradores podem acessar este módulo.' }
    }

    const adminSupabase = await createAdminClient()
    
    // 1. Obter dados da organização e plano
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('is_active, wa_integration_type, wa_api_url, wa_api_token, wa_client_token, saas_plans(features)')
      .eq('id', profile.org_id)
      .single()

    if (orgError || !org) {
      return { success: false, error: 'Erro ao buscar dados da organização.' }
    }

    // 2. Verificar se a feature disparo_massa está no plano contratado
    const features = (org.saas_plans as any)?.features || []
    const hasDisparoPlanFeature = features.includes('disparo_massa')

    // 3. Verificar se o WhatsApp está minimamente configurado
    // Se for system, usamos o padrão. Se for custom, precisa da URL configurada.
    const isWhatsAppConfigured = org.wa_integration_type === 'system' || (org.wa_integration_type === 'custom' && !!org.wa_api_url)

    // 4. Contar a quantidade de clientes que possuem telefone cadastrado
    const { count, error: countError } = await adminSupabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .not('phone_1', 'is', null)

    if (countError) {
      return { success: false, error: 'Erro ao contar clientes cadastrados.' }
    }

    return {
      success: true,
      hasDisparoPlanFeature,
      isWhatsAppConfigured,
      activeContactsCount: count || 0,
      integrationType: org.wa_integration_type || 'system'
    }

  } catch (error: any) {
    console.error('getDisparoConfig Error:', error)
    return { success: false, error: error.message }
  }
}

export async function iniciarDisparoMassa(messageTemplate: string): Promise<DisparoResponse> {
  try {
    if (!messageTemplate || messageTemplate.trim() === '') {
      return { success: false, message: 'A mensagem não pode ser vazia.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return { success: false, message: 'Organização não encontrada.' }
    }

    if (!['admin', 'superadmin', 'owner'].includes(profile.role)) {
      return { success: false, message: 'Acesso negado. Apenas administradores podem disparar mensagens.' }
    }

    const adminSupabase = await createAdminClient()

    // 1. Buscar a organização e validar plano e configurações
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('is_active, wa_integration_type, wa_api_url, wa_api_token, wa_client_token, saas_plans(features)')
      .eq('id', profile.org_id)
      .single()

    if (orgError || !org) {
      return { success: false, message: 'Organização não localizada.' }
    }

    const features = (org.saas_plans as any)?.features || []
    if (!features.includes('disparo_massa')) {
      return { success: false, message: 'O seu plano atual não possui o módulo de Disparo em Massa ativado.' }
    }

    const isWhatsAppConfigured = org.wa_integration_type === 'system' || (org.wa_integration_type === 'custom' && !!org.wa_api_url)
    if (!isWhatsAppConfigured) {
      return { success: false, message: 'Seu WhatsApp não está configurado. Por favor, configure nas Integrações antes de enviar.' }
    }

    // 2. Buscar todos os clientes com telefone cadastrado
    const { data: customers, error: customersError } = await adminSupabase
      .from('customers')
      .select('name, phone_1')
      .eq('org_id', profile.org_id)
      .not('phone_1', 'is', null)

    if (customersError || !customers) {
      return { success: false, message: 'Erro ao carregar clientes do banco de dados.' }
    }

    // 3. Montar a lista de destinatários com a mensagem personalizada
    const recipients = customers
      .map(c => {
        const phoneClean = (c.phone_1 || '').replace(/\D/g, '')
        if (!phoneClean || phoneClean.trim() === '') return null
        
        // Formatar número para garantir DDI 55
        const phone55 = phoneClean.startsWith('55') ? phoneClean : '55' + phoneClean
        
        // Personalizar a mensagem substituindo o placeholder {nome} pelo nome do tutor
        const customizedMessage = messageTemplate.replace(/{nome}/g, c.name)

        return {
          phone: phone55,
          message: customizedMessage
        }
      })
      .filter(item => item !== null)

    if (recipients.length === 0) {
      return { success: false, message: 'Nenhum cliente com telefone válido foi encontrado para envio.' }
    }

    // 4. Chamar o N8N via HTTP Post
    const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://72.62.107.69:5678'
    const n8nWebhookUrl = `${N8N_BASE_URL}/webhook/disparo-massa`

    const payload = {
      wa_integration_type: org.wa_integration_type || 'system',
      wa_api_url: org.wa_api_url || '',
      wa_api_token: org.wa_api_token || '',
      wa_client_token: org.wa_client_token || '',
      recipients: recipients
    }

    console.log(`[Disparo em Massa] Enviando ${recipients.length} destinatários para o N8N webhook...`)

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const textError = await response.text()
      console.error('[Disparo em Massa] Erro retornado pelo N8N:', textError)
      return { success: false, message: `Erro ao iniciar automação no N8N (Status ${response.status}).` }
    }

    return { 
      success: true, 
      message: `Disparo iniciado com sucesso! ${recipients.length} mensagens estão sendo enviadas em segundo plano.`
    }

  } catch (error: any) {
    console.error('iniciarDisparoMassa Error:', error)
    return { success: false, message: `Ocorreu um erro interno: ${error.message}` }
  }
}
