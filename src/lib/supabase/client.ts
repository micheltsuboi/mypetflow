import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app'))

  const cookieOptions = isLocal ? {} : { domain: '.mypetflow.com.br' }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions }
  )
}
