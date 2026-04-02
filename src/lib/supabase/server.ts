import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    // Em produção, sempre usa o domínio correto - evita chamar headers() a cada Server Action
    const cookieDomain = process.env.NODE_ENV === 'production' ? '.mypetflow.com.br' : undefined

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
