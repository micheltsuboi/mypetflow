import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook para receber atualizações de status da Focus NFe.
 * Configure esta URL no painel da Focus NFe em: 
 * Configurações -> Webhooks -> NFSe
 * Ex: https://seudominio.com.br/api/nf/webhook
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
            caminho_pdf,
            mensagem_sefaz 
        } = body

        if (!ref) {
            return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Mapear status da Focus para o nosso status interno
        // Focus statuses: autorizado, erro_autorizacao, cancelado, processando_autorizacao
        let internalStatus = 'processando'
        if (status === 'autorizado') {
            internalStatus = 'autorizado'
        } else if (status === 'erro_autorizacao' || status === 'denegado' || status === 'erro_envio' || status === 'recusado') {
            internalStatus = 'erro'
        } else if (status === 'cancelado') {
            internalStatus = 'cancelado'
        }

        // 2. Atualizar a nota no banco de dados
        const { error: updateError } = await supabase
            .from('notas_fiscais')
            .update({
                status: internalStatus,
                numero_nf: numero || null,
                serie: serie || null,
                chave_nf: chave_nfe || null,
                caminho_xml: caminho_xml || null,
                caminho_pdf: caminho_pdf || null,
                mensagem_sefaz: mensagem_sefaz || null,
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
