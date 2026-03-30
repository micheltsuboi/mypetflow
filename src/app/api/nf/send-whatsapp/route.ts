import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    try {
        const { referencia } = await req.json()

        if (!referencia) {
            return NextResponse.json({ error: 'Referência não informada' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // 1. Buscar dados da NF e da Organização
        const { data: nf, error: nfError } = await supabase
            .from('notas_fiscais')
            .select(`
                referencia, 
                valor_total, 
                status, 
                caminho_pdf, 
                origem_id, 
                origem_tipo,
                organizations (
                    wa_api_url,
                    wa_api_token,
                    wa_client_token,
                    wa_integration_type
                )
            `)
            .eq('referencia', referencia)
            .single()

        if (nfError || !nf) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
        }

        if (nf.status !== 'autorizado' || !nf.caminho_pdf) {
            return NextResponse.json({ error: 'Nota fiscal ainda não autorizada ou sem PDF' }, { status: 400 })
        }

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

        if (!phone) {
            return NextResponse.json({ error: 'Telefone do tutor não encontrado para esta nota' }, { status: 400 })
        }

        // 3. Disparar N8N
        console.log(`Manual trigger: WhatsApp automation for NF ${referencia} to ${phone}`)
        
        const orgData = nf.organizations;
        const org = (Array.isArray(orgData) ? orgData[0] : orgData) || {};
        
        const n8nResponse = await fetch('http://72.62.107.69:5678/webhook/send-nf-pdf-v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: phone,
                pdfUrl: nf.caminho_pdf,
                petName: petName,
                valor: nf.valor_total,
                ref: nf.referencia,
                // Enviar credenciais do WhatsApp
                wa_api_url: org.wa_api_url,
                wa_api_token: org.wa_api_token,
                wa_client_token: org.wa_client_token,
                wa_integration_type: org.wa_integration_type
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
