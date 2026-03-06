'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function loginWithSupabase(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Vui lòng nhập email và mật khẩu' }
    }

    const supabase = await createClient()

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        if (error) {
            return { error: error.message }
        }

        if (data.session) {
            // Thiết lập cookie tường minh trên server để Next.js đảm bảo nhận diện auth
            const cookieStore = await cookies()
            cookieStore.set('weld-control-auth', data.session.access_token, {
                httpOnly: false, // Thay đổi để Client (Browser) có thể đọc được cookie này
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: data.session.expires_in
            })

            return { success: true }
        }

        return { error: 'Không nhận được session' }
    } catch (e) {
        return { error: `Server error: ${e instanceof Error ? e.message : 'Unknown'}` }
    }
}

export async function logoutWithSupabase() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await cookies()
    cookieStore.delete('weld-control-auth')
    cookieStore.delete('sb-dvazznhntsltowhdvgee-auth-token')
}
