import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    try {
        const { referencia } = await req.json()

        if (!referencia) {
            return NextResponse.json({ error: 'Referência não informada' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // 1. Buscar dados da NF
        const { data: nf, error: nfError } = await supabase
            .from('notas_fiscais')
            .select('*')
            .eq('referencia', referencia)
            .single()

        if (nfError || !nf) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
        }

        if (nf.status !== 'autorizado' || !nf.caminho_pdf) {
            return NextResponse.json({ error: 'Nota fiscal ainda não autorizada ou sem PDF' }, { status: 400 })
        }

        if (!nf.tutor_phone) {
            return NextResponse.json({ error: 'Telefone do tutor não cadastrado nesta nota' }, { status: 400 })
        }

        // 2. Disparar N8N
        console.log(`Manual trigger: WhatsApp automation for NF ${referencia}`)
        
        const n8nResponse = await fetch('http://72.62.107.69:5678/webhook/send-nf-pdf-v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: nf.tutor_phone,
                pdfUrl: nf.caminho_pdf,
                petName: nf.pet_name || 'seu pet',
                valor: nf.valor_total,
                ref: nf.referencia
            })
        })

        if (!n8nResponse.ok) {
            throw new Error('Falha ao comunicar com servidor de automação (N8N)')
        }

        return NextResponse.json({ success: true, message: 'Comando de envio enviado com sucesso!' })

    } catch (error: any) {
        console.error('Send WhatsApp Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
