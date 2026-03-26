import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FocusNfeApi } from '@/lib/focusnfe'
import { buildNFSePayload } from '@/lib/nfse-payload'
import { buildNFePayload } from '@/lib/nfe-payload'
import { NotaFiscalOrigem, NotaFiscalTipo } from '@/types/database'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }
        
        const orgId = profile.org_id

        const body = await req.json()
        const { 
            tipo, // 'nfse' ou 'nfe'
            refId, // ID da origem
            origemTipo, // 'atendimento', 'pdv'
            tutor, 
            servico, 
            produtos,
            total_amount,
            petName,
            tutorPhone // NOVO
        } = body as any

        // 1. Check Se config existe
        const { data: config } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', orgId)
            .single()

        if (!config || !config.ativo) {
            return NextResponse.json({ error: 'Empresa não configurada ou inativa para emissão de notas' }, { status: 400 })
        }

        const env = config.ambiente as 'homologacao' | 'producao'
        const token = env === 'producao' ? config.token_producao : config.token_homologacao

        if (!token) {
            return NextResponse.json({ error: 'Token da Focus NFe não encontrado' }, { status: 500 })
        }

        let refStr = `petflow_${refId}`;
        let focusResponse;
        let payloadToSend;

        // 2. Monta Payload dependendo do tipo
        if (tipo === 'nfse') {
            if (!config.habilita_nfse) {
                return NextResponse.json({ error: 'NFSe não está habilitada.' }, { status: 400 })
            }
            if (!tutor) return NextResponse.json({ error: 'Dados do tutor obrigatórios para NFSe.' }, { status: 400 })

            payloadToSend = buildNFSePayload({
                config, 
                ref_uuid: refId, 
                tutor,
                servico
            })

            // Curitiba (4106902) e outros municípios exigem endpoint Nacional em qualquer ambiente
            const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902'

            try {
                focusResponse = await FocusNfeApi.emitirNfse({ 
                    ref: refStr, 
                    data: payloadToSend, 
                    env, 
                    token,
                    isNacional
                })
            } catch (err: any) {
                console.error("Focus NFSe error:", err)
                return NextResponse.json({ error: 'Erro ao conectar à Focus NFe (NFSe)', details: err.message }, { status: 400 })
            }
            
        } else if (tipo === 'nfe') {
            if (!config.habilita_nfe) {
                return NextResponse.json({ error: 'NFe (Produtos) não está habilitada.' }, { status: 400 })
            }
            if (!produtos || produtos.length === 0) {
                return NextResponse.json({ error: 'Itens (produtos) necessários para NFe.' }, { status: 400 })
            }

            payloadToSend = buildNFePayload({
                config,
                ref_uuid: refId,
                total_amount,
                tutor,
                items: produtos
            })

            try {
                focusResponse = await FocusNfeApi.emitirNfe({ ref: refStr, data: payloadToSend, env, token })
            } catch (err: any) {
                 console.error("Focus NFe error:", err)
                 return NextResponse.json({ error: 'Erro ao conectar à Focus NFe (NFe)', details: err.message }, { status: 400 })
            }
        } else {
            return NextResponse.json({ error: 'Tipo inválido de Nota Fiscal' }, { status: 400 })
        }

        // 3. Salvar na Tabela notas_fiscais
        // O focusResponse não retorna o PDF imediatamente (é assíncrono). Retorna status "processando_autorizacao"
        
        let initialStatus = 'processando'
        if (focusResponse.status === 'erro_autorizacao' || focusResponse.status === 'denegado') {
            initialStatus = 'erro'
        } else if (focusResponse.status === 'autorizado') {
            initialStatus = 'autorizado'
        }

        // 3. Salvar na Tabela notas_fiscais
        const dbData: any = {
            org_id: orgId,
            referencia: refStr,
            tipo,
            status: initialStatus,
            origem_tipo: origemTipo,
            origem_id: refId,
            tomador_nome: tutor?.nome || 'Consumidor',
            tomador_cpf_cnpj: tutor?.cpf,
            valor_total: total_amount || servico?.valor || 0,
            payload_enviado: payloadToSend,
            retorno_focus: focusResponse,
            mensagem_sefaz: focusResponse.mensagem_sefaz || null
        }

        const { error: dbError } = await supabase
            .from('notas_fiscais')
            .upsert(dbData, { onConflict: 'referencia' })

        if (dbError) {
            console.error("Critical fail saving nota:", dbError)
        }

        return NextResponse.json({ success: true, message: 'Nota fiscal enviada para processamento', status: initialStatus })

    } catch (error: any) {
        console.error('Emitir NF API Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
