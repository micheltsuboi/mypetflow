import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas - não requerem autenticação nem cliente Supabase
const PUBLIC_PATHS = ['/', '/cadastro', '/cadastro-empresa', '/auth', '/tutor', '/login', '/admin', '/api']

// Regex para identificar bots de IA e raspagem inutéis que consomem CPU
const BANNED_BOTS_REGEX = /gptbot|chatgpt-user|claudebot|anthropic-ai|applebot|bytespider|petalbot|yandexbot|baiduspider|semrushbot|dotbot|ahrefsbot|mj12bot|rogerbot|exabot|sogou spider|cohere-ai|screaming frog|netcrawler|google-extended/i;

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        path => pathname === path || pathname.startsWith(path + '/')
    )
}

export async function updateSession(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl

    // 1. Bloquear Bots de IA/Crawlers inutéis (Edge)
    const userAgent = request.headers.get('user-agent') || ''
    if (BANNED_BOTS_REGEX.test(userAgent)) {
        return new NextResponse('Access Denied (Bot Blocked)', { status: 403 })
    }

    // 2. Ignorar arquivos estáticos e assets residuais que batem no middleware
    if (/\.(svg|png|jpg|jpeg|gif|ico|webp|css|js|woff2?|json)$/i.test(pathname)) {
        return NextResponse.next({ request })
    }

    // ✅ Verificar rota pública ANTES de instanciar o cliente Supabase
    // Evita criação desnecessária de cliente e chamada de rede em rotas públicas
    if (isPublicRoute(pathname)) {
        return NextResponse.next({ request })
    }

    // ⚡️ OTIMIZAÇÃO: Ignorar requisições de prefetch do Next.js
    // Evita chamadas de rede externas ao Supabase ao passar o mouse ou renderizar links no painel
    const isPrefetch =
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('x-middleware-prefetch') === '1'

    if (isPrefetch) {
        return NextResponse.next({ request })
    }

    // 3. Checagem rápida de Cookies de Autenticação do Supabase
    // Se o usuário não tiver nenhum cookie do tipo sb-[project-id]-auth-token, ele não está logado.
    // Redirecionamos para / imediatamente sem criar o cliente Supabase e sem fazer chamada de rede.
    const allCookies = request.cookies.getAll()
    const hasAuthCookie = allCookies.some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (!hasAuthCookie) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    const isLocal = hostname.includes('localhost') || hostname.includes('vercel.app')
    const cookieDomain = isLocal ? undefined : '.mypetflow.com.br'

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const finalOptions = { ...options }
                        // Apenas aplicar o domínio se não estiver em localhost e se estivermos no domínio oficial
                        if (cookieDomain && !isLocal) {
                            finalOptions.domain = cookieDomain
                        }
                        supabaseResponse.cookies.set(name, value, finalOptions)
                    })
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Redireciona para login se não autenticado em rota protegida
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
