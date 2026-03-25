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
        console.log('Focus NFe Webhook Received:', body)

        const { 
            ref, 
            status, 
            numero, 
            serie, 
            chave_nfe, 
            caminho_xml, 
            caminho_xml_nota_fiscal,
            caminho_pdf,
            caminho_danfe,
            url_danfse,
            mensagem_sefaz,
            errors
        } = body

        if (!ref) {
            return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // 3. Mapear status
        let internalStatus = 'processando'
        if (status === 'autorizado') {
            internalStatus = 'autorizado'
        } else if (status === 'cancelado') {
            internalStatus = 'cancelado'
        } else if (status?.includes('erro') || status?.includes('denegado') || status?.includes('recusado') || (errors && errors.length > 0)) {
            internalStatus = 'erro'
        }

        // 2. Atualizar a nota no banco de dados
        const { error: updateError } = await supabase
            .from('notas_fiscais')
            .update({
                status: internalStatus,
                numero_nf: numero || null,
                serie: serie || null,
                chave_nf: chave_nfe || null,
                caminho_xml: caminho_xml || caminho_xml_nota_fiscal || null,
                caminho_pdf: caminho_pdf || caminho_danfe || url_danfse || null,
                mensagem_sefaz: mensagem_sefaz || body.mensagem ||
                               (errors && errors.length > 0 ? errors[0].mensagem : null) ||
                               (body.erros && body.erros.length > 0 ? body.erros[0] : null),
                retorno_focus: body,
                updated_at: new Date().toISOString()
            })
            .eq('referencia', ref)

        if (updateError) {
            console.error('Webhook DB Update Error:', updateError)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Webhook Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
