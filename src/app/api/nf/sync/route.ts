import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FocusNfeApi } from '@/lib/focusnfe'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const ref = searchParams.get('ref')
    const orgIdBase = searchParams.get('org_id')

    if (!ref) {
        return NextResponse.json({ error: 'Missing ref' }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        // 1. Buscar nota fiscal para saber o tipo
        const { data: nota, error: notaError } = await supabase
            .from('notas_fiscais')
            .select('tipo')
            .eq('referencia', ref)
            .single()

        if (notaError || !nota) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada no banco de dados.' }, { status: 404 })
        }

        // 2. Buscar configuração fiscal da org
        const { data: config, error: configError } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', orgIdBase)
            .single()

        if (configError || !config) {
            return NextResponse.json({ error: 'Configuração fiscal não encontrada.' }, { status: 404 })
        }

        // 3. Consultar na Focus NFe usando o Service
        const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902' // Curitiba
        const env = config.ambiente as 'homologacao' | 'producao'
        const token = env === 'producao' ? config.token_producao : config.token_homologacao
        if (!token) throw new Error('Token Focus não configurado.')
        
        let focusData;
        if (nota.tipo === 'nfse') {
            focusData = await FocusNfeApi.consultarNfse(ref, env, token, isNacional)
        } else {
            focusData = await FocusNfeApi.consultarNfe(ref, env, token)
        }
        
        // 4. Mapear status logicamente baseando-se no retorno da Focus
        let internalStatus = 'processando'
        if (focusData.status === 'autorizado') {
            internalStatus = 'autorizado'
        } else if (focusData.status === 'cancelado') {
            internalStatus = 'cancelado'
        } else if (focusData.status?.includes('erro') || focusData.status?.includes('denegado') || focusData.status?.includes('recusado') || (focusData.errors && focusData.errors.length > 0)) {
            internalStatus = 'erro'
        }

        const errors = focusData.errors || []

        // 4. Atualizar DB
        const { error: updateError } = await supabase
            .from('notas_fiscais')
            .update({
                status: internalStatus,
                numero_nf: focusData.numero || null,
                serie: focusData.serie || null,
                chave_nf: focusData.chave_nfe || null,
                caminho_xml: focusData.caminho_xml || focusData.caminho_xml_nota_fiscal || null,
                caminho_pdf: focusData.caminho_pdf || focusData.caminho_danfe || focusData.url_danfse || null,
                mensagem_sefaz: focusData.mensagem_sefaz || focusData.mensagem ||
                               (errors && errors.length > 0 ? errors[0].mensagem : null) ||
                               (focusData.erros && focusData.erros.length > 0 ? focusData.erros[0] : null),
                retorno_focus: focusData,
                updated_at: new Date().toISOString()
            })
            .eq('referencia', ref)

        if (updateError) throw updateError
        
        // 5. Automação de WhatsApp se acabou de autorizar
        if (internalStatus === 'autorizado') {
            console.log(`[Sync] NF ${ref} autorizada. Iniciando automação de WhatsApp...`)
            try {
                const pdfUrl = focusData.caminho_pdf || focusData.caminho_danfe || focusData.url_danfse
                console.log(`[Sync] PDF URL found: ${pdfUrl ? 'Yes' : 'No'}`)
                
                if (pdfUrl) {
                    // Buscar dados do tutor baseado na origem
                    const { data: nfExt, error: nfExtErr } = await supabase
                        .from('notas_fiscais')
                        .select(`
                            referencia, valor_total, origem_id, origem_tipo,
                            organizations (wa_api_url, wa_api_token, wa_client_token, wa_integration_type)
                        `)
                        .eq('referencia', ref)
                        .single()
                    
                    if (nfExtErr) console.error('[Sync] Error fetching NF data for WhatsApp:', nfExtErr)

                    if (nfExt) {
                        let phone = null
                        let petName = 'seu pet'
                        console.log(`[Sync] Origem: ${nfExt.origem_tipo}, ID: ${nfExt.origem_id}`)
                        
                        if (nfExt.origem_tipo === 'atendimento' || nfExt.origem_tipo === 'banho_tosa') {
                            const { data: appt } = await supabase
                                .from('appointments')
                                .select('pets(name, customers(phone_1))')
                                .eq('id', nfExt.origem_id)
                                .single()
                            if (appt) {
                                phone = (appt.pets as any)?.customers?.phone_1
                                petName = (appt.pets as any)?.name || 'seu pet'
                            }
                        } else if (nfExt.origem_tipo === 'venda' || nfExt.origem_tipo === 'pdv') {
                            const { data: order } = await supabase
                                .from('orders')
                                .select('pets(name, customers(phone_1))')
                                .eq('id', nfExt.origem_id)
                                .single()
                            if (order) {
                                phone = (order.pets as any)?.customers?.phone_1
                                petName = (order.pets as any)?.name || 'seu pet'
                            }
                        }

                        console.log(`[Sync] Phone: ${phone}, Pet: ${petName}`)

                        if (phone) {
                            // Garantir que org seja um objeto, tratando se o Supabase retornar array
                            const orgData = nfExt.organizations;
                            const org = (Array.isArray(orgData) ? orgData[0] : orgData) || {};
                            
                            console.log(`[Sync] Triggering N8N for NF ${ref} to ${phone} (Integration: ${org.wa_integration_type || 'system'})`)
                            
                            try {
                                const n8nRes = await fetch('http://72.62.107.69:5678/webhook/send-nf-pdf-v1', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        phone,
                                        pdfUrl,
                                        petName,
                                        valor: nfExt.valor_total,
                                        ref: nfExt.referencia,
                                        wa_api_url: org.wa_api_url,
                                        wa_api_token: org.wa_api_token,
                                        wa_client_token: org.wa_client_token,
                                        wa_integration_type: org.wa_integration_type
                                    })
                                })
                                console.log(`[Sync] N8N Response status: ${n8nRes.status}`)
                            } catch (e) {
                                console.error('[Sync] Error in fetch N8N:', e)
                            }
                        } else {
                            console.warn(`[Sync] WhatsApp phone not found for NF ${ref}`)
                        }
                    }
                }
            } catch (awError) {
                console.error('[Sync] Auto WhatsApp Sync Error:', awError)
            }
        }

        return NextResponse.json({ success: true, status: internalStatus, data: focusData })

    } catch (error: any) {
        console.error('Manual Sync Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
