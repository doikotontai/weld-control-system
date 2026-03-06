// lib/supabase/client.ts
// Supabase Client cho Browser — dùng supabase-js trực tiếp
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dvazznhnstlowhdvgee.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXp6bmhudHNsdG93aGR2Z2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDY2MzIsImV4cCI6MjA4ODMyMjYzMn0.XQQGeJgVVZP7JyZHAA1yf_lY_7XDUnRm5ooZV0zKttw'

// Singleton để tránh tạo nhiều instance
let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
    if (!clientInstance) {
        clientInstance = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: 'weld-control-auth',
            }
        })
    }
    return clientInstance
}
