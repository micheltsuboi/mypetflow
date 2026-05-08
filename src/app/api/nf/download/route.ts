import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const ref = searchParams.get('ref')
    const orgId = searchParams.get('org_id')
    const type = searchParams.get('type') // 'pdf' or 'xml'

    if (!ref || !orgId || !type) {
        return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        // 1. Buscar configuração fiscal da org para pegar o token
        const { data: config, error: configError } = await supabase
            .from('fiscal_config')
            .select('*')
            .eq('org_id', orgId)
            .single()

        if (configError || !config) {
            return NextResponse.json({ error: 'Configuração fiscal não encontrada.' }, { status: 404 })
        }

        // 2. Buscar info da nota para saber o tipo (nfe, nfce, nfse)
        const { data: nota, error: notaError } = await supabase
            .from('notas_fiscais')
            .select('tipo, caminho_pdf, caminho_xml')
            .eq('referencia', ref)
            .single()

        if (notaError || !nota) {
            return NextResponse.json({ error: 'Nota fiscal não encontrada.' }, { status: 404 })
        }

        const env = config.ambiente as 'homologacao' | 'producao'
        const token = env === 'producao' ? config.token_producao : config.token_homologacao
        if (!token) throw new Error('Token Focus não configurado.')

        const baseUrl = env === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br'
        
        // Construir URL da Focus
        let focusUrl = ''
        if (type === 'pdf') {
            const path = nota.caminho_pdf || `/v2/${nota.tipo === 'nfce' ? 'nfce' : 'nfe'}/${ref}.pdf`
            focusUrl = path.startsWith('http') ? path : `${baseUrl}${path}`
        } else {
            const path = nota.caminho_xml || `/v2/${nota.tipo === 'nfce' ? 'nfce' : 'nfe'}/${ref}.xml`
            focusUrl = path.startsWith('http') ? path : `${baseUrl}${path}`
        }

        // 3. Fazer o request para a Focus com Auth
        const auth = Buffer.from(`${token}:`).toString('base64')
        const response = await fetch(focusUrl, {
            headers: { 'Authorization': `Basic ${auth}` }
        })

        if (!response.ok) {
            console.error('Focus Download Error:', response.status, response.statusText)
            return NextResponse.json({ error: 'Não foi possível baixar o arquivo da Focus NFe.' }, { status: response.status })
        }

        const blob = await response.blob()
        const contentType = response.headers.get('content-type') || (type === 'pdf' ? 'application/pdf' : 'application/xml')

        // 4. Retornar o arquivo
        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${ref}.${type}"`
            }
        })

    } catch (error: any) {
        console.error('Download Proxy Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
