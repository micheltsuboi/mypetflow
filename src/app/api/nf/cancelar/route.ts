import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FocusNfeApi } from '@/lib/focusnfe'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await req.json()
        const { id, justificativa } = body

        if (!id || !justificativa || justificativa.length < 15) {
            return NextResponse.json({ error: 'ID e justificativa (mínimo 15 caracteres) são obrigatórios' }, { status: 400 })
        }

        // 1. Buscar a nota fiscal e conferir se pertence à org do usuário
        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) {
            return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
        }

        const adminSupabase = createAdminClient()
        const { data: nota, error: notaError } = await adminSupabase
            .from('notas_fiscais')
            .select('*')
            .eq('id', id)
            .eq('org_id', profile.org_id)
            .single()

        if (notaError || !nota) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada ou sem permissão' }, { status: 404 })
        }

        if (nota.status !== 'autorizado') {
            return NextResponse.json({ error: 'Apenas notas autorizadas podem ser canceladas' }, { status: 400 })
        }

        // 2. Buscar a configuração fiscal
        const { data: config, error: configError } = await adminSupabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', profile.org_id)
            .single()

        if (configError || !config) {
            return NextResponse.json({ error: 'Configuração fiscal não encontrada.' }, { status: 404 })
        }

        const env = config.ambiente as 'homologacao' | 'producao'
        const token = env === 'producao' ? config.token_producao : config.token_homologacao
        if (!token) throw new Error('Token Focus não configurado.')

        // 3. Chamar API da Focus para cancelar
        let focusResponse;
        try {
            if (nota.tipo === 'nfse') {
                focusResponse = await FocusNfeApi.cancelarNfse(nota.referencia, justificativa, env, token)
            } else {
                // TODO: Implementar cancelamento de NFe (produtos) se necessário futuramente
                return NextResponse.json({ error: 'Cancelamento automatizado disponível apenas para NFSe no momento.' }, { status: 400 })
            }
        } catch (err: any) {
            const focusErr = JSON.parse(err.message)
            return NextResponse.json({ 
                error: `Erro na Focus NFe: ${focusErr.mensagem || focusErr.error || err.message}`,
                details: focusErr
            }, { status: 400 })
        }

        // 4. Atualizar status no banco
        // O cancelamento pode ser síncrono ou assíncrono. Na NFSe costuma ser rápido.
        const { error: updateError } = await adminSupabase
            .from('notas_fiscais')
            .update({
                status: 'cancelado',
                mensagem_sefaz: `Cancelada: ${justificativa}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: 'Nota fiscal cancelada com sucesso na Focus NFe e no sistema.' })

    } catch (error: any) {
        console.error('Cancelar NF API Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
