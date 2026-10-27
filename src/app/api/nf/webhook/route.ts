import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

/**
 * Webhook para receber atualizações de status da Focus NFe.
 * Configure esta URL no painel da Focus NFe em: 
 * Configurações -> Webhooks -> NFSe
 * Ex: https://seudominio.com.br/api/nf/webhook
 * Trigger Deploy: v1.0.2
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log('Focus NFe Webhook Trace:', JSON.stringify(body, null, 2))

        // Extração robusta da referência (pode vir como ref ou referencia)
        const ref = body.ref || body.referencia
        const status = body.status
        
        if (!ref) {
            console.error('Focus Webhook Error: No reference (ref/referencia) found in body')
            return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Mapeamento de status amigável para o sistema interno
        let internalStatus = 'processando'
        if (status === 'autorizado') {
            internalStatus = 'autorizado'
        } else if (status === 'cancelado') {
            internalStatus = 'cancelado'
        } else if (
            status?.includes('erro') || 
            status?.includes('denegado') || 
            status?.includes('recusado') || 
            (body.erros && body.erros.length > 0) ||
            (body.errors && body.errors.length > 0)
        ) {
            internalStatus = 'erro'
        }

        // URLs e XML (Varia entre NFSe Nacional, NFSe e NFe)
        const pdfUrl = body.url_danfse || body.caminho_pdf || body.caminho_danfe || null
        const xmlUrl = body.caminho_xml_nota_fiscal || body.caminho_xml || null
        const mensagemSefaz = body.mensagem_sefaz || body.mensagem || 
                            (body.erros?.[0]?.mensagem) || (body.errors?.[0]?.mensagem) || 
                            (body.erros?.[0]) || null

        console.log(`Webhook Action: Updating NF ${ref} to ${internalStatus}`)

        // 1. Verificar se a nota existe e se está oculta
        const { data: notaExistente } = await supabase
            .from('notas_fiscais')
            .select('retorno_focus')
            .eq('referencia', ref)
            .single()
        
        if (notaExistente?.retorno_focus && (notaExistente.retorno_focus as any)._sistema_oculto) {
            console.log(`[Webhook] NF ${ref} está oculta pelo usuário. Ignorando update.`)
            return NextResponse.json({ success: true, message: 'Nota ignorada (oculta pelo usuário)' })
        }

        const { error: updateError } = await supabase
            .from('notas_fiscais')
            .update({
                status: internalStatus,
                numero_nf: body.numero || null,
                serie: body.serie || null,
                chave_nf: body.chave_nfe || body.chave_a_ser_consultada || null,
                caminho_xml: xmlUrl,
                caminho_pdf: pdfUrl,
                mensagem_sefaz: mensagemSefaz,
                retorno_focus: body,
                updated_at: new Date().toISOString()
            })
            .eq('referencia', ref)

        if (updateError) {
            console.error('Webhook DB Error for ref', ref, ':', updateError)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        // NOVO: Disparar Automação de WhatsApp se autorizado
        if (internalStatus === 'autorizado' && pdfUrl) {
            try {
                // 1. Buscar dados da NF e da Organização (para credenciais do WhatsApp)
                const { data: nf } = await supabase
                    .from('notas_fiscais')
                    .select(`
                        referencia, 
                        valor_total, 
                        origem_id, 
                        origem_tipo,
                        organizations (
                            wa_api_url,
                            wa_api_token,
                            wa_client_token,
                            wa_integration_type
                        )
                    `)
                    .eq('referencia', ref)
                    .single()
                if (nf) {
                    let phone = null
                    let petName = 'seu pet'

                    // 2. Buscar telefone baseado na origem
                    if (nf.origem_tipo === 'atendimento' || nf.origem_tipo === 'banho_tosa') {
                        const { data: appt } = await supabase
                            .from('appointments')
                            .select('pets(name, customers(phone_1))')
                            .eq('id', nf.origem_id)
                            .single()
                        
                        if (appt) {
                            phone = (appt.pets as any)?.customers?.phone_1
                            petName = (appt.pets as any)?.name || 'seu pet'
                        }
                    } else if (nf.origem_tipo === 'venda' || nf.origem_tipo === 'pdv') {
                        const { data: order } = await supabase
                            .from('orders')
                            .select('pets(name, customers(phone_1))')
                            .eq('id', nf.origem_id)
                            .single()
                        
                        if (order) {
                            phone = (order.pets as any)?.customers?.phone_1
                            petName = (order.pets as any)?.name || 'seu pet'
                        }
                    }

                    if (phone) {
                        const orgData = nf.organizations;
                        const org = (Array.isArray(orgData) ? orgData[0] : orgData) || {};
                        const orgId = (nf as any).org_id || (org as any).id || '';
                        
                        console.log(`[Webhook] Sending WhatsApp for NF ${ref} to ${phone} via direct Z-API router`)
                        
                        try {
                            const valorStr = nf.valor_total ? Number(nf.valor_total).toFixed(2).replace('.', ',') : '0,00';
                            const msg = `📄 *Nota Fiscal Disponível!*\n\nOlá! A Nota Fiscal referente ao atendimento de *${petName}* (Ref: ${ref}) no valor de *R$ ${valorStr}* está disponível.\n\n📎 Acesse o PDF da sua nota no link abaixo:\n${pdfUrl}\n\nQualquer dúvida, estamos à disposição! 🐾`;

                            await sendWhatsAppMessage(orgId, phone, msg, 'send-nf-pdf-v1', {
                                petName,
                                valor: nf.valor_total,
                                ref,
                                pdfUrl
                            });
                        } catch (e) {
                            console.error('[Webhook] Error sending WhatsApp for NF:', e)
                        }
                    } else {
                        console.log(`Telefone do tutor não encontrado para NF ${ref} (Origem: ${nf.origem_tipo})`)
                    }
                }
            } catch (err) {
                console.error('Error in WhatsApp trigger logic:', err)
            }
        }

        return NextResponse.json({ success: true, ref, status: internalStatus })

    } catch (error: any) {
        console.error('Webhook Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
