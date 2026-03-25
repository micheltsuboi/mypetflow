import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FocusNfeApi } from '@/lib/focusnfe'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const ref = searchParams.get('ref')
    const orgIdBase = searchParams.get('org_id')

    if (!ref) {
        return NextResponse.json({ error: 'Missing ref' }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        // 1. Buscar configuração fiscal da org
        const { data: config, error: configError } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', orgIdBase)
            .single()

        if (configError || !config) {
            return NextResponse.json({ error: 'Configuração fiscal não encontrada.' }, { status: 404 })
        }

        // 2. Consultar na Focus NFe
        // Decidir se usa endpoint Nacional ou Legado baseado no código do município
        const isNacional = config.codigo_municipio === '4106902' // Curitiba
        const token = config.ambiente === 'producao' ? config.token_producao : config.token_homologacao
        if (!token) throw new Error('Token Focus não configurado.')
        
        const response = await fetch(
            `https://api.focusnfe.com.br/v2/${isNacional ? 'nfsen' : 'nfse'}/${ref}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(token + ':').toString('base64')}`
                }
            }
        )

        const focusData = await response.json()
        
        // 3. Mapear status
        let internalStatus = 'processando'
        if (focusData.status === 'autorizado') {
            internalStatus = 'autorizado'
        } else if (focusData.status === 'erro_autorizacao' || focusData.status === 'denegado' || focusData.status === 'erro_envio' || focusData.status === 'recusado') {
            internalStatus = 'erro'
        } else if (focusData.status === 'cancelado') {
            internalStatus = 'cancelado'
        }

        const errors = focusData.errors || []

        // 4. Atualizar DB
        const { error: updateError } = await supabase
            .from('notas_fiscais')
            .update({
                status: internalStatus,
                numero_nf: focusData.numero || null,
                chave_nf: focusData.chave_nfe || null,
                caminho_xml: focusData.caminho_xml || focusData.caminho_xml_nota_fiscal || null,
                caminho_pdf: focusData.caminho_pdf || focusData.caminho_danfe || focusData.url_danfse || null,
                mensagem_sefaz: focusData.mensagem_sefaz || (errors.length > 0 ? errors[0].mensagem : null),
                retorno_focus: focusData,
                updated_at: new Date().toISOString()
            })
            .eq('referencia', ref)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, status: internalStatus, data: focusData })

    } catch (error: any) {
        console.error('Manual Sync Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
