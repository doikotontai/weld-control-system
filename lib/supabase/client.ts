// lib/supabase/client.ts
// Supabase Client cho Browser — dùng supabase-js trực tiếp
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dvazznhntsltowhdvgee.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXp6bmhudHNsdG93aGR2Z2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MzIsImV4cCI6MjA4ODMyMjYzMn0.XQQGeJgVVZP7JyZHAA1yf_lY_7XDUnRm5ooZV0zKttw'

// Variables để lưu trữ instance
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null
let currentToken: string | null = null

export function createClient() {
    let token = ''
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;)\s*weld-control-auth=([^;]+)/)
        if (match) token = match[1]
    }

    // Nếu token thay đổi hoặc chưa có client thì tạo lại
    if (!clientInstance || token !== currentToken) {
        currentToken = token
        clientInstance = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: token ? {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            } : {}
        })
    }
    return clientInstance
}
