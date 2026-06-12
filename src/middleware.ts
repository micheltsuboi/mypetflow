import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Executa o middleware APENAS em rotas que precisam de autenticação.
         * Excluídos:
         * - _next/static, _next/image (arquivos estáticos)
         * - api/* (rotas de API e webhooks)
         * - Arquivos de manifest, service worker, ícones e imagens
         * - Rotas públicas conhecidas (/, /auth, /login, /tutor, /cadastro)
         */
        '/((?!_next/static|_next/image|_next/data|api|_next/webpack|favicon\.ico|manifest\.json|sw\.js|workbox-.*\.js|icon-.*\.png|apple-touch-icon\.png|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff|woff2|ttf|otf|eot)$).*)',
    ],
}
