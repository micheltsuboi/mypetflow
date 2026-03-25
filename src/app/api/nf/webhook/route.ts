import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

        return NextResponse.json({ success: true, ref, status: internalStatus })

    } catch (error: any) {
        console.error('Webhook Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
