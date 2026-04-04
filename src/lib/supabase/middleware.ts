import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas - não requerem autenticação nem cliente Supabase
const PUBLIC_PATHS = ['/', '/cadastro', '/cadastro-empresa', '/auth', '/tutor', '/login', '/admin', '/api']

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        path => pathname === path || pathname.startsWith(path + '/')
    )
}

export async function updateSession(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl

    // ✅ Verificar rota pública ANTES de instanciar o cliente Supabase
    // Evita criação desnecessária de cliente e chamada de rede em rotas públicas
    if (isPublicRoute(pathname)) {
        return NextResponse.next({ request })
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
