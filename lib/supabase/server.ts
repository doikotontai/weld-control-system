// lib/supabase/server.ts
// Supabase Client cho Server Components và Route Handlers
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://dvazznhnstlowhdvgee.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXp6bmhudHNsdG93aGR2Z2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MzIsImV4cCI6MjA4ODMyMjYzMn0.XQQGeJgVVZP7JyZHAA1yf_lY_7XDUnRm5ooZV0zKttw'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXp6bmhudHNsdG93aGR2Z2VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0NjYzMiwiZXhwIjoyMDg4MzIyNjMyfQ.5Vc2R_A1C88jagh1Kk6wJv4SCW4h3R24GH9NR99D3AA'

export async function createClient() {
    // Lấy access token từ cookie nếu có
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('weld-control-auth')?.value

    const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: accessToken ? {
            headers: { Authorization: `Bearer ${accessToken}` }
        } : {}
    })
    return client
}

// Admin client dùng service role key (chỉ dùng trên server)
export function createAdminClient() {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
}
