import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WEBHOOK_SECRET = process.env.FOCUSNFE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
    // 1. Opcional - validacao com secret se configurado
    if (WEBHOOK_SECRET) {
        const secret = req.headers.get('x-webhook-secret')
        // Ou na url ?secret=xxx
        if (secret !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        const body = await req.json()
        const { 
            ref, 
            status, 
            status_sefaz, 
            mensagem_sefaz, 
            chave_nfe, 
            numero, 
            serie, 
            caminho_xml_nota_fiscal, 
            caminho_danfe 
        } = body

        if (!ref) {
            return NextResponse.json({ ok: false, error: 'Referencia ausente' }, { status: 400 })
        }

        // 2. Extrai ID da DB
        // A referência salva no DB é idêntica ao que enviamos, ex: "petflow_1234abcd"
        
        let newStatus = 'processando'
        if (status === 'autorizado') newStatus = 'autorizado'
        if (status === 'erro_autorizacao' || status === 'denegado') newStatus = 'erro'
        if (status === 'cancelado') newStatus = 'cancelado'

        // 3. Atualizar nota no BD (como ADMIN, pois é um webhook sem usuário logado)
        const updateData = {
            status: newStatus,
            numero_nf: numero,
            serie: serie,
            chave_nf: chave_nfe,
            caminho_xml: caminho_xml_nota_fiscal,
            caminho_pdf: caminho_danfe,
            mensagem_sefaz: mensagem_sefaz,
            retorno_focus: body, // Salva o payload completo
            updated_at: new Date().toISOString()
        }

        const { data: notaAtualizada, error } = await supabaseAdmin
            .from('notas_fiscais')
            .update(updateData)
            .eq('referencia', ref)
            .select('*')
            .single()

        if (error) {
            console.error('Webhook atualizar DB failed:', error)
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        // 4. (Opcional) Chamar Workflow N8N para enviar Email/WhatsApp ao tutor

        return NextResponse.json({ ok: true, notaId: notaAtualizada?.id })

    } catch (error: any) {
        console.error('Focus Webhook Error:', error)
        return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
    }
}
