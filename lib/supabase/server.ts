import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function requireEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

export async function createClient() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    return createSupabaseClient(
        requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
        requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: accessToken
                ? {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
                : {},
        }
    )
}

export function createAdminClient() {
    return createSupabaseClient(
        requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    )
}
