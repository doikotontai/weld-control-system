import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const browserSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const browserSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function requireBrowserEnv(
    name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: string | undefined
) {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null
let currentToken: string | null = null

function readAccessTokenFromCookie() {
    if (typeof document === 'undefined') return ''
    const match = document.cookie.match(/(?:^|;)\s*weld-control-auth=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : ''
}

export function createClient() {
    const token = readAccessTokenFromCookie()

    if (!clientInstance || token !== currentToken) {
        currentToken = token
        clientInstance = createSupabaseClient(
            requireBrowserEnv('NEXT_PUBLIC_SUPABASE_URL', browserSupabaseUrl),
            requireBrowserEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', browserSupabaseAnonKey),
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
                global: token
                    ? {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                    : {},
            }
        )
    }

    return clientInstance
}
