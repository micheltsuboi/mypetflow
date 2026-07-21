import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FocusNfeApi } from '@/lib/focusnfe'
import { buildNFeDevolucaoPayload } from '@/lib/nfe-payload'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) {
            return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
        }

        const orgId = profile.org_id
        const body = await req.json()

        const {
            chave_referenciada,
            tipo_operacao, // 0 = Entrada, 1 = Saída
            natureza_operacao,
            refId,
            tutor,
            produtos,
            total_amount,
            justificativa
        } = body as {
            chave_referenciada: string;
            tipo_operacao: 0 | 1;
            natureza_operacao?: string;
            refId?: string;
            tutor?: any;
            produtos: any[];
            total_amount: number;
            justificativa?: string;
        }

        if (!chave_referenciada || chave_referenciada.replace(/\D/g, '').length !== 44) {
            return NextResponse.json({ error: 'Chave de acesso referenciada deve conter 44 dígitos numéricos.' }, { status: 400 })
        }

        if (tipo_operacao !== 0 && tipo_operacao !== 1) {
            return NextResponse.json({ error: 'Tipo de operação inválido. Informe 0 para Entrada ou 1 para Saída.' }, { status: 400 })
        }

        if (!produtos || produtos.length === 0) {
            return NextResponse.json({ error: 'Informe ao menos um produto para devolução.' }, { status: 400 })
        }

        // 1. Obter configuração fiscal da empresa
        const { data: config } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', orgId)
            .single()

        if (!config || !config.ativo) {
            return NextResponse.json({ error: 'Empresa não configurada ou inativa para emissão de notas' }, { status: 400 })
        }

        if (!config.habilita_nfe) {
            return NextResponse.json({ error: 'Emissão de NFe (Produtos) não está habilitada na configuração fiscal.' }, { status: 400 })
        }

        const env = config.ambiente as 'homologacao' | 'producao'
        const token = env === 'producao' ? config.token_producao : config.token_homologacao

        if (!token) {
            return NextResponse.json({ error: 'Token da Focus NFe não encontrado.' }, { status: 500 })
        }

        const dynamicRefId = refId || Date.now().toString()
        const refStr = `petflow_dev_${dynamicRefId}`

        // 2. Montar Payload de Devolução
        const payloadToSend = buildNFeDevolucaoPayload({
            config,
            ref_uuid: dynamicRefId,
            chave_referenciada,
            tipo_operacao,
            natureza_operacao,
            total_amount: total_amount || 0,
            tutor,
            items: produtos
        })

        // 3. Enviar para a Focus NFe (NFe - modelo 55)
        let focusResponse: any
        try {
            focusResponse = await FocusNfeApi.emitirNfe({
                ref: refStr,
                data: payloadToSend,
                env,
                token
            })
        } catch (err: any) {
            console.error('Focus NFe devolução error:', err)
            let errMsg = err.message
            try {
                const parsedErr = JSON.parse(err.message)
                errMsg = parsedErr.mensagem || parsedErr.erros?.[0]?.mensagem || err.message
            } catch {}
            return NextResponse.json({ error: 'Erro ao emitir NFe de Devolução na Focus NFe', details: errMsg }, { status: 400 })
        }

        // 4. Salvar histórico da Nota Fiscal no Supabase
        const statusNota = focusResponse.status === 'autorizado'
            ? 'autorizado'
            : focusResponse.status === 'erro_autorizacao'
                ? 'erro'
                : 'processando'

        const { data: savedNf, error: insertError } = await supabase
            .from('notas_fiscais')
            .insert({
                org_id: orgId,
                tipo: 'nfe',
                origem_tipo: 'devolucao',
                origem_id: refId || null,
                referencia: refStr,
                status: statusNota,
                valor_total: total_amount || 0,
                tomador_nome: tutor?.nome || 'CONSUMIDOR FINAL',
                tomador_cpf_cnpj: tutor?.cpf?.replace(/\D/g, '') || null,
                numero_nf: focusResponse.numero || null,
                serie: focusResponse.serie || null,
                chave_nf: focusResponse.chave_nfe || focusResponse.chave_nf || null,
                caminho_xml: focusResponse.caminho_xml_nota_fiscal || null,
                caminho_pdf: focusResponse.caminho_danfe || null,
                payload_enviado: payloadToSend,
                retorno_focus: {
                    ...focusResponse,
                    chave_referenciada,
                    tipo_operacao,
                    justificativa
                }
            })
            .select()
            .single()

        if (insertError) {
            console.error('Erro ao salvar nota de devolução no banco:', insertError)
        }

        return NextResponse.json({
            success: true,
            nota: savedNf,
            focusResponse
        })
    } catch (error: any) {
        console.error('Erro geral ao processar devolução de NF:', error)
        return NextResponse.json({ error: error.message || 'Erro interno ao processar devolução' }, { status: 500 })
    }
}
