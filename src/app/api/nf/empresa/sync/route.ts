import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FocusNfeApi } from '@/lib/focusnfe'

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

        const { data: config } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', profile.org_id)
            .single()

        if (!config || !config.focus_empresa_id) {
            return NextResponse.json({ error: 'Configuração fiscal não encontrada' }, { status: 404 })
        }

        // 1. Consultar na Focus NFe
        const focusData = await FocusNfeApi.consultarEmpresa(config.focus_empresa_id)

        // 2. Mapear status de habilitação
        // Na Focus v2, habilitado_nfe e habilitado_nfse são booleanos no retorno da empresa
        const isNFeEnabled = focusData.habilitado_nfe === true
        const isNFSeEnabled = focusData.habilitado_nfse === true

        // 3. Atualizar banco local apenas se houver mudança ou para garantir
        const { error: updateError } = await supabase
            .from('fiscal_config')
            .update({
                habilita_nfe: isNFeEnabled,
                habilita_nfse: isNFSeEnabled,
                // Podemos atualizar outros campos se quiser, mas foco é a habilitação
                razao_social: focusData.nome,
                cnpj: focusData.cnpj,
                inscricao_municipal: focusData.inscricao_municipal,
                inscricao_estadual: focusData.inscricao_estadual,
                updated_at: new Date().toISOString()
            })
            .eq('org_id', profile.org_id)

        if (updateError) {
            console.error('Erro ao atualizar config local:', updateError)
            return NextResponse.json({ error: 'Erro ao atualizar banco de dados local' }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            habilita_nfe: isNFeEnabled, 
            habilita_nfse: isNFSeEnabled,
            message: 'Configurações sincronizadas com a Focus NFe!'
        })

    } catch (error: any) {
        console.error('Sync Fiscal Config Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
