import { createBrowserClient } from '@supabase/ssr'

let client: any

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: {} }
    )
  }

  if (client) return client

  const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app')
  const cookieOptions = isLocal ? {} : { domain: '.mypetflow.com.br' }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions }
  )

  return client
}
