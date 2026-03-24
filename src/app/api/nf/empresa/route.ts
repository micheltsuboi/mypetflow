import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FocusNfeApi, CriarEmpresaRequest } from '@/lib/focusnfe'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch org_id mapped to this user
        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.org_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const orgId = profile.org_id

        const body = await req.json()
        const { 
            empresa, 
            dry_run = false,
            // Outros campos do form para o banco de dados
            ambiente = 'homologacao',
            certificado_base64,
            senha_certificado,
            certificado_valido_ate,
            item_lista_servico,
            aliquota_iss,
            codigo_tributario_municipio,
            habilita_nfse = false,
            habilita_nfe = false
        } = body

        // 1. Criar empresa na Focus NFe
        // A API Focus NFe espera a estrutura: { cnpj: "...", nome: "...", ... }
        let focusResponse;
        try {
            focusResponse = await FocusNfeApi.criarEmpresa({ 
                data: empresa, 
                dry_run 
            })
        } catch (err: any) {
            console.error('Erro na Focus NFe:', err)
            return NextResponse.json({ error: 'Erro ao criar empresa na Focus NFe', details: err.message }, { status: 400 })
        }

        // 2. Se for dry_run, retorna apenas sucesso do teste
        if (dry_run) {
            return NextResponse.json({ success: true, message: 'Teste bem-sucedido', focusResponse })
        }

        // 3. Salvar no banco de dados (fiscal_config)
        // focusResponse retorna id, tokens, etc.
        const fiscalData = {
            org_id: orgId,
            focus_empresa_id: String(focusResponse.id),
            token_producao: focusResponse.token_producao,
            token_homologacao: focusResponse.token_homologacao,
            ambiente,
            cnpj: empresa.cnpj,
            razao_social: empresa.nome,
            inscricao_municipal: empresa.inscricao_municipal,
            inscricao_estadual: empresa.inscricao_estadual,
            regime_tributario: Number(empresa.regime_tributario || 1),
            optante_simples_nacional: true,
            codigo_municipio: empresa.codigo_municipio,
            municipio: empresa.municipio,
            uf: empresa.uf,
            cep: empresa.cep,
            item_lista_servico,
            aliquota_iss: Number(aliquota_iss || 2.0),
            codigo_tributario_municipio,
            habilita_nfse,
            habilita_nfe,
            certificado_base64,
            senha_certificado,
            certificado_valido_ate,
            ativo: true
        }

        const { error: dbError } = await supabase
            .from('fiscal_config')
            .upsert(fiscalData, { onConflict: 'org_id' })

        if (dbError) {
            console.error('Erro ao salvar no banco:', dbError)
            return NextResponse.json({ error: 'Erro interno ao salvar configurações' }, { status: 500 })
        }

        return NextResponse.json({ success: true, focus_id: focusResponse.id })

    } catch (error: any) {
        console.error('Erro interno:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
