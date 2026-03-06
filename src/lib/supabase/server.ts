import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const isLocal = host.includes('localhost') || host.includes('vercel.app')
    const cookieDomain = isLocal ? undefined : '.mypetflow.com.br'

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const finalOptions = { ...options }
                            if (cookieDomain) finalOptions.domain = cookieDomain
                            cookieStore.set(name, value, finalOptions)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
