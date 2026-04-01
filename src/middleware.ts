import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - api (API routes and webhooks that don't need Supabase Auth cookie parsing)
         * - favicon.ico, manifest.json, sw.js, and images
         */
        '/((?!_next/static|_next/image|api|favicon.ico|manifest\\.json|sw\\.js|icon-.*\\.png|apple-touch-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
