import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FocusNfeApi } from '@/lib/focusnfe'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

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
            .select('tipo, retorno_focus')
            .eq('referencia', ref)
            .single()

        if (notaError || !nota) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada no banco de dados.' }, { status: 404 })
        }

        // Se a nota está marcada como oculta (soft-delete), não sincronizamos nada
        if (nota.retorno_focus && (nota.retorno_focus as any)._sistema_oculto) {
            return NextResponse.json({ success: true, message: 'Nota ignorada (oculta pelo usuário)' })
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
                            const orgData = nfExt.organizations;
                            const org = (Array.isArray(orgData) ? orgData[0] : orgData) || {};
                            const orgId = orgIdBase || (nfExt as any).org_id || (org as any).id || '';
                            
                            console.log(`[Sync] Sending WhatsApp for NF ${ref} to ${phone} via direct Z-API router`)
                            
                            try {
                                const valorStr = nfExt.valor_total ? Number(nfExt.valor_total).toFixed(2).replace('.', ',') : '0,00';
                                const msg = `📄 *Nota Fiscal Disponível!*\n\nOlá! A Nota Fiscal referente ao atendimento de *${petName}* (Ref: ${ref}) no valor de *R$ ${valorStr}* está disponível.\n\n📎 Acesse o PDF da sua nota no link abaixo:\n${pdfUrl}\n\nQualquer dúvida, estamos à disposição! 🐾`;

                                await sendWhatsAppMessage(orgId, phone, msg, 'send-nf-pdf-v1', {
                                    petName,
                                    valor: nfExt.valor_total,
                                    ref: nfExt.referencia,
                                    pdfUrl
                                });
                            } catch (e) {
                                console.error('[Sync] Error sending WhatsApp for NF:', e)
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
