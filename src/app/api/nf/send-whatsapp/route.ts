import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

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

        // 3. Enviar via Z-API direto (novo método independente do N8N)
        console.log(`Manual trigger: WhatsApp sending for NF ${referencia} to ${phone}`)
        
        const orgData = nf.organizations;
        const org = (Array.isArray(orgData) ? orgData[0] : orgData) || {};
        const orgId = (nf as any).org_id || (org as any).id || '';

        const valorStr = nf.valor_total ? Number(nf.valor_total).toFixed(2).replace('.', ',') : '0,00';
        const msg = `📄 *Nota Fiscal Disponível!*\n\nOlá! A Nota Fiscal referente ao atendimento de *${petName}* (Ref: ${referencia}) no valor de *R$ ${valorStr}* está disponível.\n\n📎 Acesse o PDF da sua nota no link abaixo:\n${nf.caminho_pdf}\n\nQualquer dúvida, estamos à disposição! 🐾`;

        const sendRes = await sendWhatsAppMessage(orgId, phone, msg, 'send-nf-pdf-v1', {
            petName,
            valor: nf.valor_total,
            ref: referencia,
            pdfUrl: nf.caminho_pdf
        });

        if (!sendRes.success) {
            throw new Error(sendRes.error || 'Erro ao enviar WhatsApp')
        }

        return NextResponse.json({ success: true, message: 'Nota fiscal enviada via WhatsApp com sucesso!' })

    } catch (error: any) {
        console.error('Send WhatsApp Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
